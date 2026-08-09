/*
 * 化了个学 · 昵称建议 API  (Cloudflare Pages Function)
 * 路由: /hlgx/api/name/suggest?name=X
 *   GET → { "name": "X*001" }  (第一个未被任何榜单占用的建议)
 * 与 Flask 版一致: 从 X*001 到 X*999 找未占用名, 全占用则回退 X*999。
 */
import { loadAll, json } from "../../../_lib/ranklib.js";

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const name = (url.searchParams.get("name") || "").trim();
    if (!name) return json({ name: "" });

    const all = await loadAll(env);
    const used = new Set(all.map((e) => e.name));
    for (let i = 1; i <= 999; i++) {
        const cand = name + "*" + String(i).padStart(3, "0");
        if (!used.has(cand)) return json({ name: cand });
    }
    return json({ name: name + "*999" });
}
