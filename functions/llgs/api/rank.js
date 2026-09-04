/*
 * p了个s · 历了个史 排行榜 API (Cloudflare Pages Function)
 * 路由: /llgs/api/rank
 *   GET    ?mode=easy|normal|hard 查询该难度榜单(已排序)
 *   POST   请求体 JSON {mode, name, score, time, attempts?, tools?, version?, platform?, token}
 *          提交成绩; 排序 score↓ → time↑ → attempts↑ → tools↑(归位多 → 用时短 → 提交少 → 提示少)
 * KV 键: llgs:easy / llgs:normal / llgs:hard(与其他游戏榜单分离)
 * 防刷与校验规则与各游戏一致(60s/IP、昵称清洗、违禁词、≥10s、同名放开、v2.8.0 令牌校验)。
 * score 上限 5(每局卡数, ROUND_CARDS); attempts 为提交判定次数(失误); tools 为提示使用次数。
 */
import { fmtDate, clampInt, json } from "../../_lib/ranklib.js";
import { countIncr, clientIp } from "../../_lib/ratelimit.js";
import { hasBadWord } from "../../_lib/badwords.js";
import { peekGameSession, burnGameSession } from "../../_lib/gamesess.js";

export const MODES = ["easy", "normal", "hard"];
export const SCORE_MAX = 5;        // 每局 5 张事件卡(防刷上限)
const ATTEMPTS_MAX = 99;           // 提交判定次数上限
const TOOLS_MAX = 2;               // 提示每局 2 次
const SUBMIT_TTL = 60;             // 同一 IP 提交间隔(秒)
const RANK_LIMIT = 200;            // 单难度榜单条目上限
const KEY_PREFIX = "llgs:";        // KV 键前缀(与其他游戏榜单分离)

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

/** 排序键: 归位张数↓ → 用时↑ → 提交次数↑ → 提示使用↑ */
function cmpKey(e) {
    return [-(e.score | 0), e.time | 0, e.attempts | 0, e.tools | 0];
}
function keyLess(a, b) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] < b[i];
    }
    return false;
}
function sortEntries(entries) {
    return [...entries].sort((a, b) => {
        const ka = cmpKey(a), kb = cmpKey(b);
        for (let i = 0; i < ka.length; i++) {
            if (ka[i] !== kb[i]) return ka[i] - kb[i];
        }
        return 0;
    });
}

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const platform = url.searchParams.get("platform");
    let rank = sortEntries(await loadMode(env, "easy"));
    const mode = url.searchParams.get("mode");
    if (MODES.includes(mode || "")) rank = sortEntries(await loadMode(env, mode));
    if (platform === "mobile") {
        rank = rank.filter((e) => e.platform === "mobile");
    } else if (platform === "desktop") {
        rank = rank.filter((e) => e.platform !== "mobile");
    }
    return json({ mode: MODES.includes(mode || "") ? mode : "easy", platform: platform === "mobile" || platform === "desktop" ? platform : "all", rank });
}

export async function onRequestPost({ request, env }) {
    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体处理 */ }

    const mode = String(body.mode ?? "");
    if (!MODES.includes(mode)) return json({ ok: false, msg: "难度参数错误" }, 400);

    const platform = resolvePlatform(body, request);
    const ip = clientIp(request);
    const n = await countIncr(env, `llgs:rl:${ip}`, SUBMIT_TTL, 1);
    if (n > 1) return json({ ok: false, msg: "提交过于频繁,请稍后再试" }, 429);

    let name = String(body.name ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "");
    if (!name) return json({ ok: false, msg: "缺少昵称" }, 400);
    if ([...name].length > 10) return json({ ok: false, msg: "昵称不能超过 10 个字" }, 400);
    if (hasBadWord(name)) return json({ ok: false, msg: "昵称包含违禁词,请更换" }, 400);
    if (/[<>]/.test(name)) return json({ ok: false, msg: "昵称包含非法字符" }, 400);

    const score = clampInt(body.score, 0, SCORE_MAX, 0);
    const secs = Math.max(0, clampInt(body.time, 0, Number.MAX_SAFE_INTEGER, 0));
    const attempts = clampInt(body.attempts, 1, ATTEMPTS_MAX, 1);
    const tools = clampInt(body.tools, 0, TOOLS_MAX, 0);
    const version = String(body.version ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 16);

    // 成绩合理性: 10 秒以内排完 5 张不可能(防脚本刷假成绩)
    if (secs < 10) return json({ ok: false, msg: "成绩无效:用时过短" }, 400);

    // v2.8.0 一次性会话令牌: 存在 + IP 一致 + 难度匹配 + 服务端时长校验
    const token = String(body.token ?? "");
    const sess = await peekGameSession(env, "llgs", token, ip);
    if (!sess) return json({ ok: false, msg: "成绩凭证无效,请重开本局" }, 400);
    if (sess.mode !== mode) return json({ ok: false, msg: "成绩凭证与难度不符" }, 400);
    if (secs > sess.serverSecs + 10) return json({ ok: false, msg: "成绩无效:时长异常" }, 400);

    const entries = await loadMode(env, mode);
    if (entries.length >= RANK_LIMIT) return json({ ok: false, msg: "榜单已满" }, 400);

    const newKey = cmpKey({ score, time: secs, attempts, tools });
    const surpassed = entries.filter((e) =>
        (e.platform ?? "desktop") === platform && keyLess(newKey, cmpKey(e))).length;

    const entry = {
        name,
        score,
        time: secs,
        attempts,
        tools,
        platform,
        version,
        date: fmtDate(),
    };
    await burnGameSession(env, "llgs", token);   // 一次性凭证: 落库后销毁
    entries.push(entry);
    await saveMode(env, mode, entries);
    return json({ ok: true, platform, surpassed, rank: sortEntries(entries) });
}