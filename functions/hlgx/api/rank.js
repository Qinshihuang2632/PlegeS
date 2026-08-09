/*
 * 化了个学 · 排行榜 API  (Cloudflare Pages Function)
 * 路由: /hlgx/api/rank
 *   GET    ?mode=easy|normal|challenge   查询某难度榜单(已排序)
 *   POST   请求体 JSON {mode, name, hp, time, tools}  提交成绩
 * 说明(v2.1.0):
 *   - DELETE 已移除: 清榜/删记录等管理功能全部收归 /admin/api/*(会话鉴权)
 *   - POST 加固: 每 IP 30 秒限 1 次 / 昵称清洗(trim+长度1-12+去控制字符)
 *     / 数值夹取 / 单难度上限 200 条(防 KV 无限增长)
 * 排序契约与 Flask 版 hlgx_rank.py 完全一致。
 */
import { MODES, cmpKey, keyLess, sortRank, fmtDate, clampInt, loadMode, saveMode, json } from "../../_lib/ranklib.js";
import { countIncr, clientIp } from "../../_lib/ratelimit.js";

const SUBMIT_TTL = 60;      // 同一 IP 提交间隔(秒, KV TTL 下限为 60)
const RANK_LIMIT = 200;     // 单难度榜单条目上限

/* GET /hlgx/api/rank?mode=X → { "mode": X, "rank": [排序后的条目] } */
export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    let mode = url.searchParams.get("mode") || "normal";
    if (!MODES.includes(mode)) mode = "normal";
    const rank = sortRank(await loadMode(env, mode));
    return json({ mode, rank });
}

/* POST /hlgx/api/rank  请求体 {mode, name, hp, time, tools}
   → { "ok": true, "surpassed": N, "rank": [最新排序] } */
export async function onRequestPost({ request, env }) {
    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体处理 */ }

    let mode = String(body.mode ?? "normal");
    if (!MODES.includes(mode)) mode = "normal";

    // 提交频率限制: 同一 IP 每 60 秒最多 1 次(防脚本刷榜; KV TTL 下限 60s)
    const ip = clientIp(request);
    const n = await countIncr(env, `rank:rl:${ip}`, SUBMIT_TTL, 1);
    if (n > 1) return json({ ok: false, msg: "提交过于频繁,请稍后再试" }, 429);

    // 昵称清洗: trim + 剔除控制字符 + 长度 1-12(防异常输入)
    let name = String(body.name ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "");
    name = name.slice(0, 12);
    if (!name) return json({ ok: false, msg: "缺少昵称" }, 400);

    const hp = clampInt(body.hp, 0, 3, 0);
    const secs = Math.max(0, clampInt(body.time, 0, Number.MAX_SAFE_INTEGER, 0));
    const tools = clampInt(body.tools, 0, 9, 0);

    const entries = await loadMode(env, mode);
    if (entries.length >= RANK_LIMIT) return json({ ok: false, msg: "榜单已满" }, 400);

    // 先算超越人数(用当前榜单, 不含本次) — 与 Flask 一致
    const newKey = cmpKey({ hp, time: secs, tools });
    const surpassed = entries.filter((e) => keyLess(newKey, cmpKey(e))).length;

    const entry = {
        name,
        hp,
        time: secs,
        tools,
        date: fmtDate(),
    };
    entries.push(entry);
    await saveMode(env, mode, entries);
    return json({ ok: true, surpassed, rank: sortRank(entries) });
}
