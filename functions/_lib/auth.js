/*
 * 化了个学 · 管理后台鉴权 (Pages Functions 内部模块)
 * =================================================
 * 会话: KV 存储 admin:sess:<id>, HttpOnly Cookie(hlgx_admin), 24h 过期
 * 令牌: 与 env.ADMIN_TOKEN 比对(sha256 后恒定时间比较, 防时序攻击)
 * 所有 secret 只经 wrangler pages secret put(生产) / .dev.vars(本地), 不入 git。
 */
import { json } from "./ranklib.js";

export const SESSION_TTL = 24 * 3600;          // 会话有效期(秒)
export const SESSION_COOKIE = "hlgx_admin";
const SESS_PREFIX = "admin:sess:";

/* 恒定时间比较: 双方 sha256 后逐字节异或(workerd 无 timingSafeEqual, 用等长哈希比较) */
export async function tokenMatches(a, b) {
    if (!a || !b) return false;
    const enc = new TextEncoder();
    const [da, db] = await Promise.all([
        crypto.subtle.digest("SHA-256", enc.encode(a)),
        crypto.subtle.digest("SHA-256", enc.encode(b)),
    ]);
    const ha = new Uint8Array(da), hb = new Uint8Array(db);
    let diff = 0;
    for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
    return diff === 0;
}

/* 从 Cookie 头解析会话 id */
export function sessionCookieValue(request) {
    const header = request.headers.get("cookie") || "";
    for (const part of header.split(";")) {
        const i = part.indexOf("=");
        if (i < 0) continue;
        const k = part.slice(0, i).trim();
        if (k === SESSION_COOKIE) {
            try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return null; }
        }
    }
    return null;
}

export async function createSession(env, ip) {
    const id = [...crypto.getRandomValues(new Uint8Array(32))]
        .map((b) => b.toString(16).padStart(2, "0")).join("");
    // v2.8.0: 会话列表对外的公开标识(与真实会话 id 独立), 防止会话 id 被列表接口泄露后遭劫持
    const pub = [...crypto.getRandomValues(new Uint8Array(8))]
        .map((b) => b.toString(16).padStart(2, "0")).join("");
    const now = Date.now();
    const sess = { id, pub, ip, loginAt: now, expiresAt: now + SESSION_TTL * 1000 };
    await env.RANKINGS.put(SESS_PREFIX + id, JSON.stringify(sess), { expirationTtl: SESSION_TTL });
    return sess;
}

export async function verifySession(env, request) {
    const sid = sessionCookieValue(request);
    if (!sid) return null;
    const raw = await env.RANKINGS.get(SESS_PREFIX + sid);
    if (!raw) return null;
    try {
        const sess = JSON.parse(raw);
        if (!sess || !sess.expiresAt || Date.now() > sess.expiresAt) return null;
        return sess;
    } catch {
        return null;
    }
}

export async function destroySession(env, request) {
    const sid = sessionCookieValue(request);
    if (sid) await env.RANKINGS.delete(SESS_PREFIX + sid);
    return sid;
}

export function sessionCookieHeader(sid, secure) {
    return `${SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL}${secure ? "; Secure" : ""}`;
}

export function clearCookieHeader() {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/* 未登录统一响应 */
export function unauthorized() {
    return json({ ok: false, msg: "未登录或会话已过期" }, 401);
}

/*
 * CSRF 防护(v2.8.0): 管理端状态变更请求(POST/DELETE)调用。
 * Cookie 已是 SameSite=Lax, 这里再做两层纵深防御:
 *   1. Sec-Fetch-Site: cross-site 直接拒绝(现代浏览器跨站 fetch 必带此头);
 *   2. Origin 存在但与目标 host 不一致 → 拒绝(curl 等无 Origin 的客户端不受影响)。
 * 通过返回 null, 拦截返回 403 Response。
 */
export function csrfGuard(request) {
    const site = request.headers.get("sec-fetch-site");
    if (site === "cross-site") return json({ ok: false, msg: "非法请求来源" }, 403);
    const origin = request.headers.get("origin");
    if (origin) {
        let host = null;
        try { host = new URL(origin).host; } catch { return json({ ok: false, msg: "非法请求来源" }, 403); }
        if (host !== new URL(request.url).host) return json({ ok: false, msg: "非法请求来源" }, 403);
    }
    return null;
}
