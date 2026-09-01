/*
 * p了个s · AI 单词检测共享库 (functions/_lib/aicheck.js)
 * ========================================================
 * 【AI 接入内置约定(2026-08-30 确立, 接入新 AI 前必读)】
 * 1. 配置来源(优先级): KV `ylgy:ai:config`(管理后台「AI 检测」页实时修改, 对局中立即生效,
 *    无需重新部署) → 回退 Pages 环境变量 DEEPSEEK_API_KEY(初始部署用)。
 * 2. Provider 映射(PROVIDERS): 新 AI 提供商必须兼容 OpenAI /chat/completions 协议
 *    (baseURL + 默认模型), 在此表登记即可在管理后台选择; 不兼容的协议拒绝接入。
 * 3. Prompt 契约(固定, 不得随意改动): 输入单词 → 输出 JSON
 *    {"is_word": true|false, "pos": "词性缩写", "zh": "中文释义 ≤18 字"}。
 * 4. 响应契约(固定, 前端依赖): detectWord() 统一返回
 *    {ok:true, isWord:boolean, pos?, zh?} | {ok:false, msg}(ok=false → 前端回退词库判定)。
 * 5. 实时性约定: 对局中玩家每填满一个非参考答案词即实时调用(异步, 不阻塞输入);
 *    15 秒超时; 同词结果 KV 缓存 24h; 每 IP 每分钟限频(调用方负责)。
 * 6. 安全: API Key 只存 KV/环境变量, 不下发前端; 管理端展示一律脱敏。
 */

const WORD_RE = /^[a-z]{2,15}$/;
export const AI_CONFIG_KEY = "ylgy:ai:config";
export const AI_CACHE_TTL = 86400;   // 单词检测结果 KV 缓存(秒)

/** Provider 映射(接入新 AI 在此登记, 必须兼容 OpenAI /chat/completions) */
export const AI_PROVIDERS = {
    deepseek: { label: "DeepSeek", baseURL: "https://api.deepseek.com", defaultModel: "deepseek-chat" },
};

/** 读 AI 配置: KV 优先 → 环境变量回退; 返回 {enabled, provider, model, apiKey, source} */
export async function loadAiConfig(env) {
    const raw = await env.RANKINGS.get(AI_CONFIG_KEY);
    if (raw) {
        try {
            const c = JSON.parse(raw);
            if (c && typeof c === "object" && c.provider && AI_PROVIDERS[c.provider]) {
                return {
                    enabled: c.enabled === true,
                    provider: c.provider,
                    model: String(c.model || AI_PROVIDERS[c.provider].defaultModel),
                    apiKey: String(c.apiKey ?? ""),
                    source: "kv",
                };
            }
        } catch { /* 配置损坏 → 走环境变量回退 */ }
    }
    const envKey = env.DEEPSEEK_API_KEY;
    if (envKey) {
        return { enabled: true, provider: "deepseek", model: AI_PROVIDERS.deepseek.defaultModel, apiKey: String(envKey), source: "env" };
    }
    return { enabled: false, provider: "deepseek", model: AI_PROVIDERS.deepseek.defaultModel, apiKey: "", source: "none" };
}

/** 保存 AI 配置(管理后台); apiKey 传空字符串表示保留原 Key */
export async function saveAiConfig(env, { enabled, provider, model, apiKey }) {
    if (!(provider in AI_PROVIDERS)) return { ok: false, msg: "不支持的 AI 提供商" };
    const cur = await loadAiConfig(env);
    const key = String(apiKey ?? "").trim() || cur.apiKey;
    if (enabled && !key) return { ok: false, msg: "请填写 API Key" };
    const cfg = {
        enabled: enabled === true,
        provider,
        model: String(model ?? "").trim() || AI_PROVIDERS[provider].defaultModel,
        apiKey: key,
        updatedAt: new Date().toISOString(),
    };
    await env.RANKINGS.put(AI_CONFIG_KEY, JSON.stringify(cfg));
    return { ok: true, cfg };
}

/** AI 检测单词: 统一返回 {ok:true, isWord, pos?, zh?} | {ok:false, msg}(前端降级依据) */
export async function detectWord(env, word) {
    if (!WORD_RE.test(String(word))) return { ok: false, msg: "单词格式错误" };
    const w = String(word).toLowerCase();

    // 结果缓存: 同词 24h 复用(isWord/释义不随时间变化)
    const cacheKey = `ylgy:aiw:${w}`;
    const cached = await env.RANKINGS.get(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* 缓存损坏 → 走 AI */ }
    }

    const cfg = await loadAiConfig(env);
    if (!cfg.enabled || !cfg.apiKey) return { ok: false, msg: "AI 服务未配置" };
    const provider = AI_PROVIDERS[cfg.provider];
    if (!provider) return { ok: false, msg: "不支持的 AI 提供商" };

    try {
        const resp = await fetch(`${provider.baseURL}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
            body: JSON.stringify({
                model: cfg.model,
                messages: [
                    { role: "system", content: "你是严谨的英语词典助手。只输出 JSON, 不要输出任何其他文字。" },
                    { role: "user", content: `判断英文单词 "${w}" 是否为真实存在的英语单词(包含课标词汇、常见名词复数/动词变形等常用词)。` +
                        `若不是真实单词, 输出 {"is_word": false}。` +
                        `若是, 输出 {"is_word": true, "pos": "词性缩写(如 n./v./adj./adv.)", "zh": "简短中文释义, 不超过 18 个字"}` },
                ],
                response_format: { type: "json_object" },
                max_tokens: 100,
                temperature: 0,
            }),
            signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) return { ok: false, msg: "AI 服务暂不可用" };
        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content ?? "";
        let parsed;
        try { parsed = JSON.parse(content); } catch { return { ok: false, msg: "AI 返回解析失败" }; }
        let result;
        if (parsed && parsed.is_word === true) {
            result = { ok: true, isWord: true, pos: String(parsed.pos ?? "").slice(0, 8), zh: String(parsed.zh ?? "").slice(0, 40) };
        } else {
            result = { ok: true, isWord: false };
        }
        await env.RANKINGS.put(cacheKey, JSON.stringify(result), { expirationTtl: AI_CACHE_TTL });
        return result;
    } catch {
        return { ok: false, msg: "AI 服务暂不可用" };
    }
}

