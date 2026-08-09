/*
 * 化了个学 · 管理后台审计日志 API(需管理会话)
 * 路由: GET /admin/api/logs?action=&actor=&limit=&offset=
 * 响应: { total, offset, limit, entries: [最新在前] }
 */
import { json } from "../../_lib/ranklib.js";
import { verifySession, unauthorized } from "../../_lib/auth.js";
import { listAudit } from "../../_lib/audit.js";

export async function onRequestGet({ request, env }) {
    if (!(await verifySession(env, request))) return unauthorized();
    const url = new URL(request.url);
    const action = (url.searchParams.get("action") || "").trim() || undefined;
    const actor = (url.searchParams.get("actor") || "").trim() || undefined;
    const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "50", 10) || 50));
    const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);

    const { total, entries } = await listAudit(env, { action, actor, limit, offset });
    return json({ total, offset, limit, entries });
}
