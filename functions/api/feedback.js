/*
 * p了个s · 建议反馈 API (Cloudflare Pages Function)
 * 路由: /api/feedback
 *   POST  {name, content, credit?} → 提交反馈(玩家公开, 60s/IP 限频)
 *         credit(v2.5.5): 布尔, 建议被采纳后是否愿以当前昵称进入特别鸣谢榜;
 *         旧客户端不传该字段则不存储(管理端显示「—」)
 *   GET   需管理会话(见 /admin/api/feedback)
 * KV 键: feedback(数组 JSON, 上限 500 条, 新提交在前)
 * 校验: 昵称清洗(同榜单规则: ≤10 字/违禁词/< >过滤) + 内容 1~500 字 + 违禁词。
 */
import { fmtDate, clampInt, json } from "../_lib/ranklib.js";
import { countIncr, clientIp } from "../_lib/ratelimit.js";
import { hasBadWord } from "../_lib/badwords.js";

const SUBMIT_TTL = 60;      // 同一 IP 提交间隔(秒)
const FEEDBACK_MAX = 500;   // 反馈条数上限(超出丢弃最旧)
const KV_KEY = "feedback";

export async function loadFeedback(env) {
    const raw = await env.RANKINGS.get(KV_KEY);
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}
export async function saveFeedback(env, list) {
    await env.RANKINGS.put(KV_KEY, JSON.stringify(list));
}

export async function onRequestPost({ request, env }) {
    let body = {};
    try { body = await request.json(); } catch { /* 非法 JSON 按空体处理 */ }

    const ip = clientIp(request);
    const n = await countIncr(env, `feedback:rl:${ip}`, SUBMIT_TTL, 1);
    if (n > 1) return json({ ok: false, msg: "提交过于频繁,请稍后再试" }, 429);

    let name = String(body.name ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "");
    if (!name) return json({ ok: false, msg: "请填写昵称" }, 400);
    if ([...name].length > 10) return json({ ok: false, msg: "昵称不能超过 10 个字" }, 400);
    if (hasBadWord(name)) return json({ ok: false, msg: "昵称包含违禁词,请更换" }, 400);
    if (/[<>]/.test(name)) return json({ ok: false, msg: "昵称包含非法字符" }, 400);

    let content = String(body.content ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, "");
    if (!content) return json({ ok: false, msg: "请填写反馈内容" }, 400);
    if ([...content].length > 500) return json({ ok: false, msg: "反馈内容不能超过 500 个字" }, 400);
    if (hasBadWord(content)) return json({ ok: false, msg: "反馈内容包含违禁词,请修改" }, 400);

    const list = await loadFeedback(env);
    list.unshift({
        name,
        content,
        ...(body.credit === undefined ? {} : { credit: body.credit === true }),
        ip: String(ip ?? "").slice(0, 45),
        date: fmtDate(),
        ts: Date.now(),
    });
    if (list.length > FEEDBACK_MAX) list.length = FEEDBACK_MAX;
    await saveFeedback(env, list);
    return json({ ok: true, msg: "反馈已提交,感谢你的建议!" });
}