/*
 * 化了个学 · 管理后台会话管理 API(需管理会话)
 * 路由:
 *   GET    /admin/api/sessions           → 活跃会话列表
 *   DELETE /admin/api/sessions?id=<sid>  → 强制下线(可下线自己, 之后即失效)
 * 强制下线写审计日志。
 */
import { json } from "../../_lib/ranklib.js";
import { verifySession, unauthorized, csrfGuard } from "../../_lib/auth.js";
import { clientIp } from "../../_lib/ratelimit.js";
import { appendAudit } from "../../_lib/audit.js";

const PREFIX = "admin:sess:";

export async function onRequestGet({ request, env }) {
    const me = await verifySession(env, request);
    if (!me) return unauthorized();
    const now = Date.now();
    const list = await env.RANKINGS.list({ prefix: PREFIX });
    const sessions = [];
    for (const k of list.keys) {
        const raw = await env.RANKINGS.get(k.name);
        if (!raw) continue;
        try {
            const s = JSON.parse(raw);
            if (s && s.expiresAt && s.expiresAt > now) {
                // v2.8.0: 只下发公开标识(历史无 pub 的会话回退为截断的真实 id),
                // 完整会话 id 不出服务端, 防止列表接口泄露后被构造 Cookie 劫持
                const pub = s.pub || k.name.slice(PREFIX.length, PREFIX.length + 12);
                sessions.push({
                    id: pub,
                    current: s.id === me.id,
                    ip: s.ip || "",
                    loginAt: s.loginAt,
                    expiresAt: s.expiresAt,
                });
            }
        } catch { /* 跳过损坏条目 */ }
    }
    // 最新登录在前
    sessions.sort((a, b) => b.loginAt - a.loginAt);
    return json({ sessions });
}

export async function onRequestDelete({ request, env }) {
    const sess = await verifySession(env, request);
    if (!sess) return unauthorized();
    const csrf = csrfGuard(request);   // v2.8.0: 跨站请求防护
    if (csrf) return csrf;
    const url = new URL(request.url);
    const id = (url.searchParams.get("id") || "").trim();
    if (!id) return json({ ok: false, msg: "缺少会话 id" }, 400);
    // 按公开标识定位真实会话; 历史无 pub 的会话允许用真实 id 前缀(≥12位)兜底匹配
    const list = await env.RANKINGS.list({ prefix: PREFIX });
    let target = null;
    for (const k of list.keys) {
        const realId = k.name.slice(PREFIX.length);
        if (realId === id) { target = realId; break; }   // 兼容旧前端直传完整 id
        const raw = await env.RANKINGS.get(k.name);
        if (!raw) continue;
        try {
            const s = JSON.parse(raw);
            if (s && s.pub === id) { target = realId; break; }
            if (!s?.pub && realId.startsWith(id) && id.length >= 12) { target = realId; break; }
        } catch { /* 跳过损坏条目 */ }
    }
    if (!target) return json({ ok: false, msg: "会话不存在或已过期" }, 404);
    await env.RANKINGS.delete(PREFIX + target);
    await appendAudit(env, {
        actor: "admin", action: "session_revoke", ip: clientIp(request),
        detail: `强制下线会话 ${target.slice(0, 8)}…${target === sess.id ? "(当前会话)" : ""}`,
    });
    return json({ ok: true, msg: "已强制下线" });
}
