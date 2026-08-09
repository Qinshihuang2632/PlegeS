/*
 * 化了个学 · 管理后台会话管理 API(需管理会话)
 * 路由:
 *   GET    /admin/api/sessions           → 活跃会话列表
 *   DELETE /admin/api/sessions?id=<sid>  → 强制下线(可下线自己, 之后即失效)
 * 强制下线写审计日志。
 */
import { json } from "../../_lib/ranklib.js";
import { verifySession, unauthorized } from "../../_lib/auth.js";
import { clientIp } from "../../_lib/ratelimit.js";
import { appendAudit } from "../../_lib/audit.js";

const PREFIX = "admin:sess:";

export async function onRequestGet({ request, env }) {
    if (!(await verifySession(env, request))) return unauthorized();
    const now = Date.now();
    const list = await env.RANKINGS.list({ prefix: PREFIX });
    const sessions = [];
    for (const k of list.keys) {
        const raw = await env.RANKINGS.get(k.name);
        if (!raw) continue;
        try {
            const s = JSON.parse(raw);
            if (s && s.expiresAt && s.expiresAt > now) {
                sessions.push({
                    id: k.name.slice(PREFIX.length),
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
    const url = new URL(request.url);
    const id = (url.searchParams.get("id") || "").trim();
    if (!id) return json({ ok: false, msg: "缺少会话 id" }, 400);
    await env.RANKINGS.delete(PREFIX + id);
    await appendAudit(env, {
        actor: "admin", action: "session_revoke", ip: clientIp(request),
        detail: `强制下线会话 ${id.slice(0, 8)}…${id === sess.id ? "(当前会话)" : ""}`,
    });
    return json({ ok: true, msg: "已强制下线" });
}
