/*
 * p了个s · 英语单词数独 排行榜 API (Cloudflare Pages Function)
 * 路由: /ylgy/api/rank
 *   GET    ?mode=easy|normal|hard 查询该难度榜单(已排序)
 *   POST   请求体 JSON {mode, name, hp, time, tools, clears?, version?, platform?}
 *          提交成绩; 排序 hp↓ → clears↓ → time↑ → tools↑(tools=技能使用次数, 用得少排前, 与化了个学一致)
 * KV 键: ylgy:easy / ylgy:normal / ylgy:hard(与化了个学的键分离)
 * 防刷与校验规则与 /hlgx/api/rank 一致(60s/IP、昵称清洗、违禁词、≥10s、同名放开)。
 */
import { MODES as _MODES, cmpKey, keyLess, sortRank, fmtDate, clampInt, json } from "../../_lib/ranklib.js";
import { countIncr, clientIp } from "../../_lib/ratelimit.js";
import { hasBadWord } from "../../_lib/badwords.js";
import { peekGameSession, burnGameSession } from "../../_lib/gamesess.js";

export const MODES = ["easy", "normal", "hard"];
const SUBMIT_TTL = 60;      // 同一 IP 提交间隔(秒)
const RANK_LIMIT = 200;     // 单难度榜单条目上限
const KEY_PREFIX = "ylgy:";   // KV 键前缀(与化了个学榜单分离)
/* 成绩物理上限(v2.8.0): fills ≤ 总字母数(词数×词长); tools ≤ 填空提示2 + 含义提示1 */
const FILLS_MAX = { easy: 16, normal: 30, hard: 40 };
const TOOLS_MAX = 3;

async function loadMode(env, mode) {
    const raw = await env.RANKINGS.get(KEY_PREFIX + mode);
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}
async function saveMode(env, mode, list) {
    await env.RANKINGS.put(KEY_PREFIX + mode, JSON.stringify(list));
}

function resolvePlatform(body, request) {
    const p = String(body.platform ?? "").toLowerCase();
    if (p === "mobile" || p === "desktop") return p;
    const ua = String(request.headers.get("user-agent") || "");
    return /mobile|android|iphone|ipad|ipod/i.test(ua) ? "mobile" : "desktop";
}

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    let mode = url.searchParams.get("mode") || "normal";
    if (!MODES.includes(mode)) mode = "normal";
    const platform = url.searchParams.get("platform");
    let rank = sortRank(await loadMode(env, mode));
    if (platform === "mobile") {
        rank = rank.filter((e) => e.platform === "mobile");
    } else if (platform === "desktop") {
        rank = rank.filter((e) => e.platform !== "mobile");
    }
    return json({ mode, platform: platform === "mobile" || platform === "desktop" ? platform : "all", rank });
}

export async function onRequestPost({ request, env }) {
    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体处理 */ }

    let mode = String(body.mode ?? "normal");
    if (!MODES.includes(mode)) mode = "normal";

    const platform = resolvePlatform(body, request);

    const ip = clientIp(request);
    const n = await countIncr(env, `ylgy:rl:${ip}`, SUBMIT_TTL, 1);
    if (n > 1) return json({ ok: false, msg: "提交过于频繁,请稍后再试" }, 429);

    let name = String(body.name ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "");
    if (!name) return json({ ok: false, msg: "缺少昵称" }, 400);
    if ([...name].length > 10) return json({ ok: false, msg: "昵称不能超过 10 个字" }, 400);
    if (hasBadWord(name)) return json({ ok: false, msg: "昵称包含违禁词,请更换" }, 400);
    if (/[<>]/.test(name)) return json({ ok: false, msg: "昵称包含非法字符" }, 400);

    const hp = clampInt(body.hp, 0, 3, 0);
    const secs = Math.max(0, clampInt(body.time, 0, Number.MAX_SAFE_INTEGER, 0));
    const tools = clampInt(body.tools, 0, TOOLS_MAX, 0);
    const clears = clampInt(body.clears, 0, FILLS_MAX[mode] ?? 40, 0);
    const version = String(body.version ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 16);

    // 成绩合理性: 10 秒以内通关不可能(防脚本刷假成绩); 失败局(hp=0)放宽 ——
    // 真实玩家快速失败(乱填几个字母血量耗尽)应当能上榜, 刷失败记录无排名收益
    if (secs < 10 && hp > 0) return json({ ok: false, msg: "成绩无效:用时过短" }, 400);

    // 游戏会话凭证(v2.8.0 防刷榜): 开局下发的一次性 token, 全部校验通过才销毁
    const token = String(body.token ?? "");
    const sess = await peekGameSession(env, "ylgy", token, ip);
    if (!sess.ok) return json({ ok: false, msg: sess.msg }, 400);
    if (sess.rec.mode !== mode) return json({ ok: false, msg: "会话与难度不匹配,请重新开局后再提交" }, 400);
    // 服务端实际经过时长必须 ≥ 上报用时(容忍 10s 误差): 不玩游戏直接构造成绩无法通过
    const serverSecs = Math.floor((Date.now() - sess.rec.startedAt) / 1000);
    if (serverSecs + 10 < secs) return json({ ok: false, msg: "成绩校验失败:上报用时短于实际游戏时长,请稍后重试" }, 400);

    const entries = await loadMode(env, mode);
    if (entries.length >= RANK_LIMIT) return json({ ok: false, msg: "榜单已满" }, 400);

    const newKey = cmpKey({ hp, clears, time: secs, tools });
    const surpassed = entries.filter((e) =>
        (e.platform ?? "desktop") === platform && keyLess(newKey, cmpKey(e))).length;

    const entry = {
        name,
        hp,
        clears,
        time: secs,
        tools,
        platform,
        version,
        date: fmtDate(),
    };
    entries.push(entry);
    await burnGameSession(env, "ylgy", token);   // 一次性凭证: 校验全部通过后销毁
    await saveMode(env, mode, entries);
    return json({ ok: true, platform, surpassed, rank: sortRank(entries) });
}
