/*
 * 化了个学 · 排行榜 API  (Cloudflare Pages Function)
 * 路由: /hlgx/api/rank
 *   GET    ?mode=easy|normal|challenge   查询某难度榜单(已排序)
 *   POST   请求体 JSON {mode, name, hp, time, tools}  提交成绩
 *   DELETE ?mode=easy|normal|challenge|all            清空榜单
 * 契约与 Flask 版 hlgx_rank.py 完全一致。
 */
import { MODES, cmpKey, keyLess, sortRank, fmtDate, clampInt, loadMode, saveMode, json } from "../../_lib/ranklib.js";

/* GET /hlgx/api/rank?mode=X → { "mode": X, "rank": [排序后的条目] } */
export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    let mode = url.searchParams.get("mode") || "normal";
    if (!MODES.includes(mode)) mode = "normal";
    const rank = sortRank(await loadMode(env, mode));
    return json({ mode, rank });
}

/* POST /hlgx/api/rank  请求体 {mode, name, hp, time, tools}
   → { "ok": true, "surpassed": N, "rank": [最新排序] } */
export async function onRequestPost({ request, env }) {
    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体处理 */ }

    let mode = String(body.mode ?? "normal");
    if (!MODES.includes(mode)) mode = "normal";

    const name = String(body.name ?? "").trim();
    if (!name) return json({ ok: false, msg: "缺少昵称" }, 400);

    const hp = clampInt(body.hp, 0, 3, 0);
    const secs = Math.max(0, clampInt(body.time, 0, Number.MAX_SAFE_INTEGER, 0));
    const tools = clampInt(body.tools, 0, 9, 0);

    const entries = await loadMode(env, mode);
    // 先算超越人数(用当前榜单, 不含本次) — 与 Flask 一致
    const newKey = cmpKey({ hp, time: secs, tools });
    const surpassed = entries.filter((e) => keyLess(newKey, cmpKey(e))).length;

    const entry = {
        name,
        hp,
        time: secs,
        tools,
        date: fmtDate(),
    };
    entries.push(entry);
    await saveMode(env, mode, entries);
    return json({ ok: true, surpassed, rank: sortRank(entries) });
}

/* DELETE /hlgx/api/rank?mode=easy|normal|challenge|all
   → { "ok": true, "msg": "已清空 xxx 榜单" } */
export async function onRequestDelete({ request, env }) {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "";
    if (MODES.includes(mode)) {
        await saveMode(env, mode, []);
        return json({ ok: true, msg: `已清空 ${mode} 榜单` });
    }
    if (mode === "all") {
        for (const m of MODES) await saveMode(env, m, []);
        return json({ ok: true, msg: "已清空全部榜单" });
    }
    return json({ ok: false, msg: "参数错误" }, 400);
}
