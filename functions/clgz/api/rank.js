/*
 * p了个s · 错了个字 排行榜 API (Cloudflare Pages Function)
 * 路由: /clgz/api/rank
 *   GET    ?mode=all 查询榜单(已排序)
 *   POST   请求体 JSON {mode, name, score, time, version?, platform?}
 *          提交成绩; 排序 score↓ → time↑(得分多者靠前, 同分用时短者靠前)
 * KV 键: clgz:all(与化了个学/英了个语榜单分离)
 * 防刷与校验规则与 /hlgx/api/rank 一致(60s/IP、昵称清洗、违禁词、≥10s、同名放开)。
 */
import { fmtDate, clampInt, json } from "../../_lib/ranklib.js";
import { countIncr, clientIp } from "../../_lib/ratelimit.js";
import { hasBadWord } from "../../_lib/badwords.js";

export const MODES = ["all"];
const SUBMIT_TTL = 60;      // 同一 IP 提交间隔(秒)
const RANK_LIMIT = 200;     // 单难度榜单条目上限
const KEY_PREFIX = "clgz:"; // KV 键前缀(与化了个学/英了个语榜单分离)

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

/** 排序键: 得分↓ → 用时↑ */
function cmpKey(e) {
    return [-(e.score | 0), e.time | 0];
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
    let rank = sortEntries(await loadMode(env, "all"));
    if (platform === "mobile") {
        rank = rank.filter((e) => e.platform === "mobile");
    } else if (platform === "desktop") {
        rank = rank.filter((e) => e.platform !== "mobile");
    }
    return json({ mode: "all", platform: platform === "mobile" || platform === "desktop" ? platform : "all", rank });
}

export async function onRequestPost({ request, env }) {
    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体处理 */ }

    const platform = resolvePlatform(body, request);
    const ip = clientIp(request);
    const n = await countIncr(env, `clgz:rl:${ip}`, SUBMIT_TTL, 1);
    if (n > 1) return json({ ok: false, msg: "提交过于频繁,请稍后再试" }, 429);

    let name = String(body.name ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "");
    if (!name) return json({ ok: false, msg: "缺少昵称" }, 400);
    if ([...name].length > 10) return json({ ok: false, msg: "昵称不能超过 10 个字" }, 400);
    if (hasBadWord(name)) return json({ ok: false, msg: "昵称包含违禁词,请更换" }, 400);
    if (/[<>]/.test(name)) return json({ ok: false, msg: "昵称包含非法字符" }, 400);

    const score = clampInt(body.score, 0, 999, 0);
    const secs = Math.max(0, clampInt(body.time, 0, Number.MAX_SAFE_INTEGER, 0));
    const version = String(body.version ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 16);

    // 成绩合理性: 10 秒以内完成 8 题手写不可能(防脚本刷假成绩)
    if (secs < 10) return json({ ok: false, msg: "成绩无效:用时过短" }, 400);

    const entries = await loadMode(env, "all");
    if (entries.length >= RANK_LIMIT) return json({ ok: false, msg: "榜单已满" }, 400);

    const newKey = cmpKey({ score, time: secs });
    const surpassed = entries.filter((e) =>
        (e.platform ?? "desktop") === platform && keyLess(newKey, cmpKey(e))).length;

    const entry = {
        name,
        score,
        time: secs,
        platform,
        version,
        date: fmtDate(),
    };
    entries.push(entry);
    await saveMode(env, "all", entries);
    return json({ ok: true, platform, surpassed, rank: sortEntries(entries) });
}
