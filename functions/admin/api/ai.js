/*
 * p了个s · 管理后台 AI 检测设置 API(需管理会话)
 * 路由: /admin/api/ai
 *   GET  → { ok, config: { enabled, provider, model, apiKeyMasked, source, updatedAt }, providers }
 *   POST { enabled, provider, model, apiKey? } → 保存配置(apiKey 留空 = 保留原 Key), 写审计日志
 *   POST { action: "test", word? } → 用当前配置实测一次 AI 检测(返回 ok/isWord/释义/耗时)
 * 配置存 KV `ylgy:ai:config`, 对局中立即生效, 无需重新部署(约定见 functions/_lib/aicheck.js)。
 */
import { json } from "../../_lib/ranklib.js";
import { verifySession, unauthorized, csrfGuard } from "../../_lib/auth.js";
import { clientIp } from "../../_lib/ratelimit.js";
import { appendAudit } from "../../_lib/audit.js";
import { AI_CONFIG_KEY, AI_PROVIDERS, loadAiConfig, saveAiConfig, detectWord } from "../../_lib/aicheck.js";

function maskKey(key) {
    if (!key) return "";
    if (key.length <= 8) return "****";
    return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

export async function onRequestGet({ request, env }) {
    if (!(await verifySession(env, request))) return unauthorized();
    const cfg = await loadAiConfig(env);
    return json({
        ok: true,
        config: {
            enabled: cfg.enabled,
            provider: cfg.provider,
            model: cfg.model,
            apiKeyMasked: maskKey(cfg.apiKey),
            hasKey: !!cfg.apiKey,
            source: cfg.source,
            updatedAt: (await env.RANKINGS.get(`${AI_CONFIG_KEY}:at`)) ?? "",
        },
        providers: Object.entries(AI_PROVIDERS).map(([id, p]) => ({ id, label: p.label, defaultModel: p.defaultModel })),
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

    // 测试连接: 用当前保存/传入配置实测一次
    if (body.action === "test") {
        const t0 = Date.now();
        const result = await detectWord(env, String(body.word ?? "apple").toLowerCase());
        const ms = Date.now() - t0;
        await appendAudit(env, {
            actor: "admin", action: "ai_config_test", ip,
            detail: `AI 检测连接测试: ${result.ok ? `成功(${ms}ms)` : `失败(${result.msg ?? "未知"})`}`,
        });
        return json({ ...result, ms });
    }

    // 保存配置
    const r = await saveAiConfig(env, {
        enabled: body.enabled === true,
        provider: String(body.provider ?? "deepseek"),
        model: String(body.model ?? ""),
        apiKey: String(body.apiKey ?? ""),
    });
    if (!r.ok) return json(r, 400);
    const cfg = r.cfg;
    await appendAudit(env, {
        actor: "admin", action: "ai_config_update", ip,
        detail: `AI 检测配置更新: ${cfg.enabled ? "启用" : "停用"} / ${cfg.provider} / ${cfg.model} / Key ${cfg.apiKey ? "已设置" : "未设置"}`,
    });
    return json({ ok: true, msg: "已保存, 对局中即时生效" });
}
