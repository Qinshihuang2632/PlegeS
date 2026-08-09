/*
 * 化了个学 · KV 计数限频 (Pages Functions 内部模块)
 * =================================================
 * 基于 KV 的滑动窗口计数, 供两处使用:
 *   - 管理登录锁定: 每 IP 连续失败 5 次 → 锁 15 分钟
 *   - 榜单提交限频: 每 IP 30 秒最多 1 次
 */

/* 自增并返回新值(带 TTL, 窗口滑动) */
export async function countIncr(env, key, ttlSeconds, max) {
    const raw = await env.RANKINGS.get(key);
    let n = 0;
    try { n = Number.parseInt(raw, 10) || 0; } catch { n = 0; }
    n++;
    await env.RANKINGS.put(key, String(n), { expirationTtl: ttlSeconds });
    return Math.min(n, max + 1);   // 封顶, 防止计数无限增长
}

export async function countGet(env, key) {
    const raw = await env.RANKINGS.get(key);
    const n = Number.parseInt(raw || "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function countReset(env, key) {
    await env.RANKINGS.delete(key);
}

/* 客户端 IP(cf-connecting-ip 优先, 本地无 CDN 时回退 x-forwarded-for) */
export function clientIp(request) {
    const cf = request.headers.get("cf-connecting-ip");
    if (cf) return cf;
    const xff = request.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    return "unknown";
}
