/*
 * 化了个学 · 昵称查重 API  (Cloudflare Pages Function)
 * 路由: /hlgx/api/name/exists?name=X
 *   GET → { "exists": true|false }
 * 在所有难度榜单中做精确匹配, 与 Flask 版行为一致。
 */
import { loadAll, json } from "../../../_lib/ranklib.js";

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const name = (url.searchParams.get("name") || "").trim();
    let exists = false;
    if (name) {
        const all = await loadAll(env);
        exists = all.some((e) => e.name === name);
    }
    return json({ exists });
}
