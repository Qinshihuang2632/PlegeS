/*
 * 化了个学 · 审计日志 (Pages Functions 内部模块)
 * =============================================
 * KV key `admin:audit` 存环形数组, 上限 AUDIT_MAX 条(超出丢弃最旧)。
 * 每次管理操作(登录/登出/删榜/清榜/下线等)都落一条: 时间/操作者/动作/详情/IP。
 */
import { fmtDate } from "./ranklib.js";

export const AUDIT_MAX = 500;
const KEY = "admin:audit";

async function loadList(env) {
    const raw = await env.RANKINGS.get(KEY);
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

export async function appendAudit(env, { actor = "admin", action, detail = "", ip = "" }) {
    const entry = {
        ts: Date.now(),
        time: fmtDate(new Date()),
        actor,
        action,
        detail,
        ip,
    };
    const list = await loadList(env);
    list.push(entry);
    if (list.length > AUDIT_MAX) list.splice(0, list.length - AUDIT_MAX);   // 环形截断
    await env.RANKINGS.put(KEY, JSON.stringify(list));
    return entry;
}

/* 倒序(最新在前) + 可选按 action/actor 过滤 + 分页 */
export async function listAudit(env, { action, actor, limit = 50, offset = 0 } = {}) {
    const list = await loadList(env);
    let filtered = [...list].reverse();
    if (action) filtered = filtered.filter((e) => e.action === action);
    if (actor) filtered = filtered.filter((e) => e.actor === actor);
    return {
        total: filtered.length,
        entries: filtered.slice(offset, offset + limit),
    };
}
