/*
 * 化了个学 · SPA 回退函数(根级兜底, 路由优先级最低)
 * =================================================
 * 由 public/_routes.json 限定只处理:
 *   /hlgx/api/*(未知子路径 404) /hlgx/hua /hlgx/rank(游戏 SPA 路由) /admin/*(管理 SPA)
 *   /ylgy/api/*(英了个语, 旧缩写 ws 于 v1.4.9 改名) /ws(旧链接, SPA 重定向兼容)
 *   /clgz/api/*(错了个字)
 * 具体 API 路由(如 /hlgx/api/rank)由更具体的 Function 优先命中, 不会走到这里。
 *
 * 流程: 未知 API 路径 → 404 JSON(保持 API 404 契约);
 *       带扩展名的路径按静态文件处理(命中即原样返回);
 *       其余视为 SPA 路由, 按前缀回退到 /admin/index.html 或 /index.html(React Router 接管)。
 */
import { json } from "./_lib/ranklib.js";

export async function onRequest({ env, request }) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 未知 API 路径保持 404 契约(不要回退成 SPA 页面)
    if (path.startsWith("/hlgx/api/") || path.startsWith("/ylgy/api/")
        || path.startsWith("/clgz/api/") || path.startsWith("/admin/api/")) {
        return json({ ok: false, msg: "接口不存在" }, 404);
    }

    // 带扩展名的路径 → 按静态文件处理(命中即返回, 不命中则回退)
    if (/\.[a-zA-Z0-9]{1,8}$/.test(path)) {
        const asset = await env.ASSETS.fetch(request);
        if (asset.status !== 404) return asset;
    }

    // SPA 回退: 管理后台 → /admin/(静态目录索引), 其余 → /(静态目录索引)
    // 注意: 不能直接取 /index.html 或 /admin/index.html —— Pages 会将其规范化 308 重定向
    const entry = path.startsWith("/admin/") ? "/admin/" : "/";
    return env.ASSETS.fetch(new Request(`${url.origin}${entry}`, request));
}
