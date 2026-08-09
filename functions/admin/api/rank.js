/*
 * 化了个学 · 管理后台榜单管理 API(全部需管理会话)
 * 路由:
 *   GET    /admin/api/rank?mode=X[&q=昵称关键字]   → 榜单(含管理索引 key, 可搜索)
 *   DELETE /admin/api/rank?key=N&mode=X            → 单条删除(按存储数组索引)
 *   DELETE /admin/api/rank?mode=easy|normal|challenge|all → 清榜
 * 每次删除/清榜都写审计日志。
 */
import { MODES, sortRank, loadMode, saveMode, json } from "../../_lib/ranklib.js";
import { verifySession, unauthorized } from "../../_lib/auth.js";
import { clientIp } from "../../_lib/ratelimit.js";
import { appendAudit } from "../../_lib/audit.js";

async function authed(env, request) {
    return await verifySession(env, request);
}

export async function onRequestGet({ request, env }) {
    if (!(await authed(env, request))) return unauthorized();
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "normal";
    if (!MODES.includes(mode)) return json({ ok: false, msg: "参数错误" }, 400);

    const raw = await loadMode(env, mode);
    const rank = sortRank(raw).map((e, i) => ({ ...e, key: raw.indexOf(e) }));
    const q = (url.searchParams.get("q") || "").trim();
    const filtered = q ? rank.filter((e) => String(e.name).includes(q)) : rank;
    return json({ mode, total: raw.length, rank: filtered });
}

export async function onRequestDelete({ request, env }) {
    const sess = await authed(env, request);
    if (!sess) return unauthorized();
    const ip = clientIp(request);
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "";
    const key = url.searchParams.get("key");

    /* 单条删除 */
    if (key !== null) {
        if (!MODES.includes(mode)) return json({ ok: false, msg: "参数错误" }, 400);
        const raw = await loadMode(env, mode);
        const i = Number.parseInt(key, 10);
        if (!Number.isInteger(i) || i < 0 || i >= raw.length) {
            return json({ ok: false, msg: "记录不存在" }, 404);
        }
        const [removed] = raw.splice(i, 1);
        await saveMode(env, mode, raw);
        await appendAudit(env, {
            actor: "admin", action: "rank_delete_one", ip,
            detail: `${mode} 删除 ${removed.name}(${removed.hp}/${removed.time}/${removed.tools})`,
        });
        return json({ ok: true, msg: `已删除 ${removed.name} 的记录` });
    }

    /* 清空单难度 / 全部 */
    if (MODES.includes(mode)) {
        const count = (await loadMode(env, mode)).length;
        await saveMode(env, mode, []);
        await appendAudit(env, { actor: "admin", action: "rank_clear_mode", ip, detail: `${mode} 清空 ${count} 条` });
        return json({ ok: true, msg: `已清空 ${mode} 榜单` });
    }
    if (mode === "all") {
        let total = 0;
        for (const m of MODES) {
            total += (await loadMode(env, m)).length;
            await saveMode(env, m, []);
        }
        await appendAudit(env, { actor: "admin", action: "rank_clear_all", ip, detail: `清空全部 ${total} 条` });
        return json({ ok: true, msg: "已清空全部榜单" });
    }
    return json({ ok: false, msg: "参数错误" }, 400);
}
