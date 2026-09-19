/*
 * 错了个字 · AI 手写识别 API (Cloudflare Pages Function)
 * 路由: /clgz/api/ai
 *   POST {image, target} → {ok, isTarget, recognized?, msg?}
 *   用途: 手写字图片(卡面 PNG base64) → 腾讯云通用手写体识别 →
 *         判定玩家写的是否为目标字(识别文本含目标字即写对)。
 *   降级: OCR 未配置/失败 → ok:false, 前端回退像素重合度判定。
 *   限频: 每 IP 每分钟 20 次(windowRate, 窗口可 <60s)。
 */
import { json } from "../../_lib/ranklib.js";
import { clientIp, windowRate } from "../../_lib/ratelimit.js";
import { ocrHandwriting } from "../../_lib/tencentOcr.js";

const RATE_LIMIT = 20;   // 每 IP 每分钟识别次数

export async function onRequestPost({ request, env }) {
    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体处理 */ }

    const image = String(body.image ?? "").replace(/^data:image\/\w+;base64,/, "").replace(/\s+/g, "");
    const target = String(body.target ?? "").trim();
    if (!/^[一-龥]$/.test(target)) return json({ ok: false, msg: "目标字参数错误" }, 400);
    if (image.length < 100 || image.length > 600000) return json({ ok: false, msg: "图片数据无效" }, 400);

    const ip = clientIp(request);
    const n = await windowRate(env, `clgz:ai:${ip}`, 60, RATE_LIMIT);
    if (n > RATE_LIMIT) return json({ ok: false, msg: "识别请求过于频繁,请稍后再试" }, 429);

    const result = await ocrHandwriting(env, image, target);
    return json(result);
}
