/*
 * p了个s · 游玩记录上报 API (Cloudflare Pages Function)
 * 路由: /api/playlog
 *   POST {game, mode, name?, win, score, time, version, platform}
 *   用途: 未参与排行榜的游玩(未填昵称 / 勾选不参与)也在结算时上报一条游玩记录,
 *         供管理后台「游玩记录」页查看(按游玩时间先后排序的数据表)。
 *   不入榜: 本接口与各游戏 rank API 完全分离, 不影响排行榜。
 * KV 键: playlog(数组 JSON, 上限 1500 条, 超出丢弃最旧)
 * 校验: game 白名单 / mode≤16 / name≤10(可空) / score 0~9999 / time≥0;
 *   限频 30s/IP; 记录真实 IP 仅供管理员查看(管理端受会话保护)。
 */
import { fmtDate, json } from "../_lib/ranklib.js";
import { countIncr, clientIp } from "../_lib/ratelimit.js";

const GAMES = ["hlgx", "ylgy", "flgl", "plgp", "llgs"];
const PLAYLOG_MAX = 1500;
const KV_KEY = "playlog";
const SUBMIT_TTL = 60;   // 同一 IP 上报间隔(秒, KV TTL 下限 60)

export async function loadPlayLog(env) {
    const raw = await env.RANKINGS.get(KV_KEY);
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}
export async function savePlayLog(env, list) {
    await env.RANKINGS.put(KV_KEY, JSON.stringify(list));
}

export async function onRequestPost({ request, env }) {
    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体处理 */ }

    const ip = clientIp(request);
    const n = await countIncr(env, `playlog:rl:${ip}`, SUBMIT_TTL, 1);
    if (n > 1) return json({ ok: false, msg: "提交过于频繁,请稍后再试" }, 429);

    const game = String(body.game ?? "").trim();
    if (!GAMES.includes(game)) return json({ ok: false, msg: "游戏参数错误" }, 400);
    const mode = String(body.mode ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 16);
    if (!mode) return json({ ok: false, msg: "难度参数错误" }, 400);

    const name = String(body.name ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 10);
    const win = body.win === true || body.win === 1 ? 1 : 0;
    const score = Math.max(0, Math.min(9999, Number.parseInt(body.score, 10) || 0));
    const time = Math.max(0, Number.parseInt(body.time, 10) || 0);
    const tools = Math.max(0, Math.min(99, Number.parseInt(body.tools, 10) || 0));
    const version = String(body.version ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 16);
    const platform = String(body.platform ?? "").toLowerCase() === "mobile" ? "mobile" : "desktop";

    const list = await loadPlayLog(env);
    list.unshift({ game, mode, name, win, score, time, tools, version, platform, ip, date: fmtDate() });
    if (list.length > PLAYLOG_MAX) list.length = PLAYLOG_MAX;
    await savePlayLog(env, list);
    return json({ ok: true });
}
