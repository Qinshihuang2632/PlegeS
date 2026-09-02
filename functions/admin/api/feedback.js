/*
 * p了个s · 管理后台建议反馈 API(全部需管理会话)
 * 路由:
 *   GET    /admin/api/feedback[?q=关键字]   → 反馈列表(新在前, 可搜索昵称/内容)
 *   DELETE /admin/api/feedback?key=N        → 单条删除(按数组索引)
 *   DELETE /admin/api/feedback?clear=1      → 清空全部
 * 每次删除/清空都写审计日志。
 */
import { json } from "../../_lib/ranklib.js";
import { verifySession, unauthorized, csrfGuard } from "../../_lib/auth.js";
import { clientIp } from "../../_lib/ratelimit.js";
import { appendAudit } from "../../_lib/audit.js";
import { loadFeedback, saveFeedback } from "../../api/feedback.js";

async function authed(env, request) {
    return await verifySession(env, request);
}

export async function onRequestGet({ request, env }) {
    if (!(await authed(env, request))) return unauthorized();
    const url = new URL(request.url);
    const list = await loadFeedback(env);
    // v2.8.5: 下发真实 IP 供管理端展示(管理端受会话保护); 历史条目(无 ip)显示「—」
    const withKey = list.map((e, i) => ({ ...e, ip: e.ip ?? "", key: i }));
    const q = (url.searchParams.get("q") || "").trim();
    const filtered = q
        ? withKey.filter((e) => String(e.name).includes(q) || String(e.content).includes(q))
        : withKey;
    return json({ total: list.length, feedback: filtered });
}

export async function onRequestDelete({ request, env }) {
    const sess = await authed(env, request);
    if (!sess) return unauthorized();
    const csrf = csrfGuard(request);   // v2.8.0: 跨站请求防护
    if (csrf) return csrf;
    const ip = clientIp(request);
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (key !== null) {
        const list = await loadFeedback(env);
        const i = Number.parseInt(key, 10);
        if (!Number.isInteger(i) || i < 0 || i >= list.length) {
            return json({ ok: false, msg: "记录不存在" }, 404);
        }
        const [removed] = list.splice(i, 1);
        await saveFeedback(env, list);
        await appendAudit(env, {
            actor: "admin", action: "feedback_delete_one", ip,
            detail: `删除反馈 ${removed.name}:${String(removed.content).slice(0, 30)}`,
        });
        return json({ ok: true, msg: "已删除该反馈" });
    }

    if (url.searchParams.get("clear") === "1") {
        const count = (await loadFeedback(env)).length;
        await saveFeedback(env, []);
        await appendAudit(env, { actor: "admin", action: "feedback_clear", ip, detail: `清空全部反馈 ${count} 条` });
        return json({ ok: true, msg: `已清空全部反馈(${count} 条)` });
    }
    return json({ ok: false, msg: "参数错误" }, 400);
}
