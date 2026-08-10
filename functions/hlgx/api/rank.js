/*
 * 化了个学 · 排行榜 API  (Cloudflare Pages Function)
 * 路由: /hlgx/api/rank
 *   GET    ?mode=easy|normal|challenge[&platform=mobile|desktop]
 *          查询某难度榜单(已排序); 传 platform 只返回该平台条目(旧条目无 platform 归端游)
 *   POST   请求体 JSON {mode, name, hp, time, tools, platform?}
 *          提交成绩; platform 缺省按 User-Agent 兜底判断(手游/端游)
 * 说明(v2.1.4):
 *   - 平台区分: 手游(mobile)/端游(desktop)榜单分开, 排名仅与同平台比较;
 *     旧客户端不传 platform 时按 UA 判断, 历史条目(无 platform 字段)归端游
 *   - DELETE 已移除: 管理功能全部收归 /admin/api/*(会话鉴权)
 *   - 防刷: 每 IP 60 秒限 1 次 / 昵称清洗(trim+长度1-10+去控制字符+违禁字)
 *     / 成绩合理性(用时≥10秒) / 单难度上限 200 条 / 同名 24h 限 3 次
 * 排序契约与 Flask 版 hlgx_rank.py 完全一致。
 */
import { MODES, cmpKey, keyLess, sortRank, fmtDate, clampInt, loadMode, saveMode, json } from "../../_lib/ranklib.js";
import { countIncr, clientIp } from "../../_lib/ratelimit.js";
import { hasBadWord } from "../../_lib/badwords.js";

const SUBMIT_TTL = 60;      // 同一 IP 提交间隔(秒, KV TTL 下限为 60)
const RANK_LIMIT = 200;     // 单难度榜单条目上限

/** 平台解析: 显式值优先, 否则按 User-Agent 兜底(旧客户端自动区分) */
function resolvePlatform(body, request) {
    const p = String(body.platform ?? "").toLowerCase();
    if (p === "mobile" || p === "desktop") return p;
    const ua = String(request.headers.get("user-agent") || "");
    return /mobile|android|iphone|ipad|ipod/i.test(ua) ? "mobile" : "desktop";
}

/* GET /hlgx/api/rank?mode=X[&platform=Y]
   → { "mode": X, "platform": "all"|"mobile"|"desktop", "rank": [排序后条目] } */
export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    let mode = url.searchParams.get("mode") || "normal";
    if (!MODES.includes(mode)) mode = "normal";
    const platform = url.searchParams.get("platform");   // null | "mobile" | "desktop" | 其他
    let rank = sortRank(await loadMode(env, mode));
    if (platform === "mobile") {
        rank = rank.filter((e) => e.platform === "mobile");
    } else if (platform === "desktop") {
        rank = rank.filter((e) => e.platform !== "mobile");   // 旧条目(无 platform)归端游
    }
    return json({ mode, platform: platform === "mobile" || platform === "desktop" ? platform : "all", rank });
}

/* POST /hlgx/api/rank  请求体 {mode, name, hp, time, tools, platform?}
   → { "ok": true, "platform": X, "surpassed": N, "rank": [最新排序] } */
export async function onRequestPost({ request, env }) {
    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体处理 */ }

    let mode = String(body.mode ?? "normal");
    if (!MODES.includes(mode)) mode = "normal";

    const platform = resolvePlatform(body, request);

    // 提交频率限制: 同一 IP 每 60 秒最多 1 次(防脚本刷榜; KV TTL 下限 60s)
    const ip = clientIp(request);
    const n = await countIncr(env, `rank:rl:${ip}`, SUBMIT_TTL, 1);
    if (n > 1) return json({ ok: false, msg: "提交过于频繁,请稍后再试" }, 429);

    // 昵称清洗: trim + 剔除控制字符(防异常输入)
    let name = String(body.name ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "");
    if (!name) return json({ ok: false, msg: "缺少昵称" }, 400);
    // 字数限制: 最多 10 个字(按码点计, 与前端显示一致)
    if ([...name].length > 10) return json({ ok: false, msg: "昵称不能超过 10 个字" }, 400);
    // 违禁字检测: 违背公序良俗的字词组合一律拒绝(禁止入榜)
    if (hasBadWord(name)) return json({ ok: false, msg: "昵称包含违禁词,请更换" }, 400);
    // 防脚本注入试探: < > 是 XSS/提示词注入的典型特征字符, 数据保持干净
    if (/[<>]/.test(name)) return json({ ok: false, msg: "昵称包含非法字符" }, 400);

    const hp = clampInt(body.hp, 0, 3, 0);
    const secs = Math.max(0, clampInt(body.time, 0, Number.MAX_SAFE_INTEGER, 0));
    const tools = clampInt(body.tools, 0, 9, 0);

    // 成绩合理性: 一局至少几十次点击, 10 秒以内不可能(防脚本刷 1~2 秒假成绩)
    if (secs < 10) return json({ ok: false, msg: "成绩无效:用时过短" }, 400);

    // 同一昵称 24 小时内最多提交 3 次(防同名刷屏)
    const nickKey = `rank:nick:${name}`;
    const nickCount = await countIncr(env, nickKey, 86400, 3);
    if (nickCount > 3) return json({ ok: false, msg: "该昵称今日提交次数过多,请更换昵称" }, 429);

    const entries = await loadMode(env, mode);
    if (entries.length >= RANK_LIMIT) return json({ ok: false, msg: "榜单已满" }, 400);

    // 超越人数: 仅与同平台条目比较(手游/端游榜单分开)
    const newKey = cmpKey({ hp, time: secs, tools });
    const surpassed = entries.filter((e) =>
        (e.platform ?? "desktop") === platform && keyLess(newKey, cmpKey(e))).length;

    const entry = {
        name,
        hp,
        time: secs,
        tools,
        platform,
        date: fmtDate(),
    };
    entries.push(entry);
    await saveMode(env, mode, entries);
    return json({ ok: true, platform, surpassed, rank: sortRank(entries) });
}
