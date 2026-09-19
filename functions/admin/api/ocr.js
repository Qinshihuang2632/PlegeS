/*
 * p了个s · 管理后台 错了个字 OCR 配置 API(需管理会话)
 * 路由: /admin/api/ocr
 *   GET  → {ok, config: {enabled, region, secretIdMasked, hasKey}, updatedAt}
 *   POST {enabled, region, secretId?, secretKey?} → 保存(secretKey 留空=保留原值), 写审计
 *   POST {action:"test"} → 用当前配置真实调用一次通用手写体识别(返回鉴权/连通结果)
 * 与英了个语的 DeepSeek 配置(ai.js)相互独立。
 */
import { json } from "../../_lib/ranklib.js";
import { verifySession, unauthorized, csrfGuard } from "../../_lib/auth.js";
import { clientIp } from "../../_lib/ratelimit.js";
import { appendAudit } from "../../_lib/audit.js";
import { loadOcrConfig, saveOcrConfig, ocrHandwriting } from "../../_lib/tencentOcr.js";

function maskKey(key) {
    if (!key) return "";
    if (key.length <= 10) return "****";
    return `${key.slice(0, 6)}****${key.slice(-4)}`;
}

export async function onRequestGet({ request, env }) {
    if (!(await verifySession(env, request))) return unauthorized();
    const cfg = await loadOcrConfig(env);
    return json({
        ok: true,
        config: {
            enabled: cfg.enabled,
            region: cfg.region,
            secretIdMasked: maskKey(cfg.secretId),
            hasKey: !!cfg.secretId && !!cfg.secretKey,
        },
    });
}

export async function onRequestPost({ request, env }) {
    const sess = await verifySession(env, request);
    if (!sess) return unauthorized();
    const csrf = csrfGuard(request);
    if (csrf) return csrf;
    const ip = clientIp(request);

    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体处理 */ }

    // 测试连接: 用当前配置真实调用一次(1x1 图 → 鉴权通过即视为连接正常)
    if (body.action === "test") {
        const t0 = Date.now();
        // 1x1 白色 PNG(最小合法图片, OCR 层会报图片无效但足以验证鉴权/连通)
        const png1x1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/58BAwAI/AL+g5mFAAAAAElFTkSuQmCC";
        const result = await ocrHandwriting(env, png1x1, "测");
        const ms = Date.now() - t0;
        // 连通判定: 腾讯返回业务错误(说明鉴权/签名/参数已过到 OCR 层)也视为连通;
        // 只有「未配置」/网络失败视为不可达
        const reachable = result.ok || /腾讯 OCR 错误/.test(result.msg ?? "");
        await appendAudit(env, {
            actor: "admin", action: "ocr_config_test", ip,
            detail: `错了个字 OCR 连接测试: ${reachable ? `连通(${ms}ms)${result.msg ?? ""}` : `失败(${result.msg ?? "未知"})`}`,
        });
        return json({ ok: reachable, reachable, ms, msg: result.msg ?? "" });
    }

    const r = await saveOcrConfig(env, {
        enabled: body.enabled === true,
        region: String(body.region ?? "ap-guangzhou"),
        secretId: String(body.secretId ?? ""),
        secretKey: String(body.secretKey ?? ""),
    });
    if (!r.ok) return json(r, 400);
    const cfg = r.cfg;
    await appendAudit(env, {
        actor: "admin", action: "ocr_config_update", ip,
        detail: `错了个字 OCR 配置更新: ${cfg.enabled ? "启用" : "停用"} / ${cfg.region} / Key ${cfg.secretKey ? "已设置" : "未设置"}`,
    });
    return json({ ok: true, msg: "已保存, 即时生效" });
}
