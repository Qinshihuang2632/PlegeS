/*
 * 英了个语 · AI 单词检测 API (Cloudflare Pages Function)
 * 路由: /ylgy/api/ai
 *   POST {word} → { ok, isWord?, pos?, zh?, msg? }
 *   作用: 判断玩家填出的单词是否为真实存在的英语单词, 并给出简短中文释义。
 *         (是否与本局参考答案一致由前端本地比对, 不消耗 AI 调用)
 *   配置: KV `ylgy:ai:config`(管理后台「AI 检测」页实时修改, 对局中立即生效)
 *         → 回退环境变量 DEEPSEEK_API_KEY; 详见 functions/_lib/aicheck.js 的接入约定。
 *   降级: 未配置/关闭/调用失败 → ok:false, 前端回退词库判定(旧行为)。
 *   限频: 每 IP 每分钟 20 次(KV 滑动窗口)。
 */
import { json } from "../../_lib/ranklib.js";
import { clientIp, countIncr } from "../../_lib/ratelimit.js";
import { detectWord } from "../../_lib/aicheck.js";

const RATE_LIMIT = 20;   // 每 IP 每分钟检测次数

export async function onRequestPost({ request, env }) {
    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体处理 */ }
    const word = String(body.word ?? "").toLowerCase().trim();
    if (!/^[a-z]{2,15}$/.test(word)) return json({ ok: false, msg: "单词格式错误" }, 400);

    const ip = clientIp(request);
    const n = await countIncr(env, `ylgy:ai:${ip}`, 60, RATE_LIMIT);
    if (n > RATE_LIMIT) return json({ ok: false, msg: "检测请求过于频繁,请稍后再试" }, 429);

    return json(await detectWord(env, word));
}
