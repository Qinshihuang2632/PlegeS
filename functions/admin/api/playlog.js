/*
 * p了个s · 管理后台游玩记录 API(需管理会话)
 * 路由:
 *   GET    /admin/api/playlog[?game=ylgy][?q=昵称] → 游玩记录列表(新提交在前, 含真实 IP)
 *   DELETE /admin/api/playlog?clear=1               → 清空全部(写审计日志)
 * 数据来源: 玩家端 /api/playlog(未参与排行榜的游玩结算上报)
 */
import { json } from "../../_lib/ranklib.js";
import { verifySession, unauthorized, csrfGuard } from "../../_lib/auth.js";
import { clientIp } from "../../_lib/ratelimit.js";
import { appendAudit } from "../../_lib/audit.js";
import { loadPlayLog, savePlayLog } from "../../api/playlog.js";

export async function onRequestGet({ request, env }) {
    if (!(await verifySession(env, request))) return unauthorized();
    const url = new URL(request.url);
    const game = (url.searchParams.get("game") || "").trim();
    const q = (url.searchParams.get("q") || "").trim();
    let list = await loadPlayLog(env);
    if (game) list = list.filter((e) => e.game === game);
    if (q) list = list.filter((e) => String(e.name ?? "").includes(q));
    return json({ total: list.length, list });
}

export async function onRequestDelete({ request, env }) {
    const sess = await verifySession(env, request);
    if (!sess) return unauthorized();
    const csrf = csrfGuard(request);
    if (csrf) return csrf;
    const url = new URL(request.url);
    if (url.searchParams.get("clear") === "1") {
        const count = (await loadPlayLog(env)).length;
        await savePlayLog(env, []);
        await appendAudit(env, {
            actor: "admin", action: "playlog_clear", ip: clientIp(request),
            detail: `清空全部游玩记录 ${count} 条`,
        });
        return json({ ok: true, msg: `已清空 ${count} 条记录` });
    }
    return json({ ok: false, msg: "参数错误" }, 400);
}
