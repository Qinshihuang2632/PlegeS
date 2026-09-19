/*
 * 错了个字 · OCR 识别开关(公开, 供前端决定判定路径) (Cloudflare Pages Function)
 * 路由: /clgz/api/ai-config
 *   GET → {ok, enabled}   enabled=true 表示 OCR 判定已启用(前端走 AI 判定);
 *         false 则前端使用像素重合度判定(降级/未配置)。
 */
import { json } from "../../_lib/ranklib.js";
import { loadOcrConfig } from "../../_lib/tencentOcr.js";

export async function onRequestGet({ env }) {
    const cfg = await loadOcrConfig(env);
    return json({ ok: true, enabled: cfg.enabled && !!cfg.secretId });
}
