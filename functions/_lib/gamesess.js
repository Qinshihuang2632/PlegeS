/*
 * p了个s · 游戏会话令牌 (Pages Functions 内部模块)
 * =================================================
 * 防刷榜(v2.8.0): 开局时客户端向 /<game>/api/session 申领一次性令牌,
 * 提交成绩时必须携带。服务端记录开局时间戳并绑定 IP, 提交时校验:
 *   1. 令牌存在且属于该游戏、该难度;
 *   2. 提交 IP 与开局 IP 一致(防令牌倒卖/代理池分发);
 *   3. 服务端实际经过时长 ≥ 客户端上报用时(容忍 10s 误差)——
 *      不上报对应的真实游戏时长就无法通过, 批量刷榜成本大幅提高;
 *   4. 一次性: 通过全部校验后销毁, 不可复用。
 * KV 键: gsess:<game>:<token>, TTL 3 小时(足够打完最慢的一局)。
 * 申领限频: 每 IP 每分钟最多 10 次(正常玩家一次开局申领一次, 余量充足)。
 */

import { countIncr } from "./ratelimit.js";

const SESS_TTL = 3 * 3600;      // 令牌有效期(秒)
const ISSUE_TTL = 60;           // 申领限频窗口(秒)
const ISSUE_MAX = 10;           // 窗口内每 IP 最多申领次数
const TOKEN_RE = /^[0-9a-f]{48}$/;

/* 申领令牌: 返回 token 字符串; 触发限频返回 null(调用方回 429) */
export async function issueGameSession(env, game, mode, ip) {
    const n = await countIncr(env, `gsess:rl:${ip}`, ISSUE_TTL, ISSUE_MAX);
    if (n > ISSUE_MAX) return null;
    const token = [...crypto.getRandomValues(new Uint8Array(24))]
        .map((b) => b.toString(16).padStart(2, "0")).join("");
    const rec = { ip: String(ip ?? ""), mode, startedAt: Date.now() };
    await env.RANKINGS.put(`gsess:${game}:${token}`, JSON.stringify(rec), { expirationTtl: SESS_TTL });
    return token;
}

/* 读取并校验令牌(不销毁): 全部通过返回 { ok: true, rec }, 否则 { ok: false, msg } */
export async function peekGameSession(env, game, token, ip) {
    token = String(token ?? "");
    if (!TOKEN_RE.test(token)) return { ok: false, msg: "缺少游戏会话凭证,请重新开局后再提交" };
    const raw = await env.RANKINGS.get(`gsess:${game}:${token}`);
    if (!raw) return { ok: false, msg: "游戏会话不存在或已过期,请重新开局后再提交" };
    let rec = null;
    try { rec = JSON.parse(raw); } catch { /* 损坏按无效处理 */ }
    if (!rec || typeof rec.startedAt !== "number") {
        return { ok: false, msg: "游戏会话凭证无效,请重新开局后再提交" };
    }
    if (rec.ip && ip && rec.ip !== String(ip)) {
        return { ok: false, msg: "网络环境已变化,请重新开局后再提交" };
    }
    return { ok: true, rec };
}

/* 销毁令牌(一次性): 仅在全部校验通过、成绩即将落库前调用 */
export async function burnGameSession(env, game, token) {
    await env.RANKINGS.delete(`gsess:${game}:${String(token ?? "")}`);
}
