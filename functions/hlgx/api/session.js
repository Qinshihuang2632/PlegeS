/*
 * 化了个学 · 游戏会话令牌 API (Cloudflare Pages Function)
 * 路由: /hlgx/api/session
 *   POST {mode} → { ok, token }   开局申领一次性成绩提交凭证(v2.8.0 防刷榜)
 *   限频: 每 IP 每分钟最多申领 10 次; 令牌绑定 IP + 难度, 3 小时有效, 提交后即销毁
 */
import { MODES, json } from "../../_lib/ranklib.js";
import { clientIp } from "../../_lib/ratelimit.js";
import { issueGameSession } from "../../_lib/gamesess.js";

export async function onRequestPost({ request, env }) {
    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体处理 */ }
    const mode = String(body.mode ?? "");
    if (!MODES.includes(mode)) return json({ ok: false, msg: "难度参数错误" }, 400);
    const token = await issueGameSession(env, "hlgx", mode, clientIp(request));
    if (!token) return json({ ok: false, msg: "操作过于频繁,请稍后再试" }, 429);
    return json({ ok: true, token });
}
