/*
 * 化了个学 · 管理后台鉴权 API
 * 路由(Pages 函数按路径精确匹配, 用 HTTP 方法区分动作):
 *   POST   /admin/api/auth    body {token}   → 登录(创建会话, Set-Cookie)
 *   DELETE /admin/api/auth                    → 登出(销毁会话)
 *   GET    /admin/api/auth                    → 当前会话信息(401 未登录)
 * 安全:
 *   - 令牌与 env.ADMIN_TOKEN 比对(sha256 + 恒定时间比较)
 *   - 登录限频: 每 IP 连续失败 5 次 → 锁 15 分钟
 *   - 会话 Cookie: HttpOnly + SameSite=Lax + 生产 Secure + Path=/, 24h 过期
 *   - 登录成功/失败全程审计
 */
import { json } from "../../_lib/ranklib.js";
import {
    SESSION_TTL, tokenMatches, createSession, verifySession,
    destroySession, sessionCookieHeader, clearCookieHeader,
} from "../../_lib/auth.js";
import { countIncr, countGet, countReset, clientIp } from "../../_lib/ratelimit.js";
import { appendAudit } from "../../_lib/audit.js";

const LOCK_MAX = 5;        // 连续失败上限
const LOCK_TTL = 15 * 60;  // 锁定 15 分钟(秒)

/* POST /admin/api/auth → 登录 */
export async function onRequestPost({ request, env }) {
    const ip = clientIp(request);
    if (!env.ADMIN_TOKEN) {
        return json({ ok: false, msg: "未配置管理员令牌(ADMIN_TOKEN)" }, 500);
    }
    // 登录限频: 已锁定 → 直接拒绝
    const lockKey = `admin:lock:${ip}`;
    const locked = await countGet(env, lockKey);
    if (locked >= LOCK_MAX) {
        return json({ ok: false, msg: "失败次数过多,已锁定 15 分钟" }, 429);
    }

    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体 */ }
    const token = String(body.token ?? "");
    if (!token) return json({ ok: false, msg: "缺少令牌" }, 400);

    const ok = await tokenMatches(token, env.ADMIN_TOKEN);
    if (!ok) {
        const n = await countIncr(env, lockKey, LOCK_TTL, LOCK_MAX);
        await appendAudit(env, { actor: "unknown", action: "login_fail", detail: `IP ${ip} 第 ${n} 次失败`, ip });
        const remain = LOCK_MAX - n;
        return json({
            ok: false,
            msg: remain > 0 ? `令牌错误,还剩 ${remain} 次机会` : "令牌错误,已锁定 15 分钟",
        }, 401);
    }

    await countReset(env, lockKey);
    const sess = await createSession(env, ip);
    await appendAudit(env, { actor: "admin", action: "login_success", detail: `IP ${ip}`, ip });
    const secure = new URL(request.url).protocol === "https:";
    return new Response(JSON.stringify({
        ok: true,
        msg: "登录成功",
        session: { loginAt: sess.loginAt, expiresAt: sess.expiresAt, ttl: SESSION_TTL },
    }), {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Set-Cookie": sessionCookieHeader(sess.id, secure),
        },
    });
}

/* DELETE /admin/api/auth → 登出 */
export async function onRequestDelete({ request, env }) {
    const ip = clientIp(request);
    const sid = await destroySession(env, request);
    if (sid) {
        await appendAudit(env, { actor: "admin", action: "logout", detail: `会话 ${sid.slice(0, 8)}…`, ip });
    }
    return new Response(JSON.stringify({ ok: true, msg: "已退出登录" }), {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Set-Cookie": clearCookieHeader(),
        },
    });
}

/* GET /admin/api/auth → 当前会话 */
export async function onRequestGet({ request, env }) {
    const sess = await verifySession(env, request);
    if (!sess) return json({ ok: false, msg: "未登录或会话已过期" }, 401);
    return json({
        ok: true,
        actor: "admin",
        loginAt: sess.loginAt,
        expiresAt: sess.expiresAt,
        ip: sess.ip,
    });
}
