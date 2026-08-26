/*
 * 化了个学 · 管理后台 API 客户端
 */
import type { AuditPage, FeedbackList, RankList, SessionInfo } from "./types";

async function j<T>(res: Response): Promise<T> {
    try { return (await res.json()) as T; } catch { return {} as T; }
}

/* 登录: 成功时 Set-Cookie 由浏览器自动保存 */
export async function apiLogin(token: string) {
    const res = await fetch("/admin/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
    });
    const data = await j<{ ok?: boolean; msg?: string }>(res);
    return { ok: res.ok && data.ok === true, status: res.status, msg: data.msg ?? "" };
}

export async function apiLogout() {
    await fetch("/admin/api/auth", { method: "DELETE" }).catch(() => {});
}

export async function apiMe(): Promise<AdminMe | null> {
    const res = await fetch("/admin/api/auth");
    if (res.status === 401) return null;
    const data = await j<AdminMe>(res);
    return data.ok ? data : null;
}

export async function apiRanks(game: string, mode: string, q = ""): Promise<RankList | null> {
    const res = await fetch(`/admin/api/rank?game=${encodeURIComponent(game)}&mode=${encodeURIComponent(mode)}&q=${encodeURIComponent(q)}`);
    return res.ok ? j<RankList>(res) : null;
}

export async function apiDeleteRankEntry(game: string, mode: string, key: number, expect?: { name: string; date: string }): Promise<{ ok: boolean; msg?: string }> {
    // v2.8.0: 附带期望删除的昵称/日期, 服务端校验不一致说明榜单已被并发修改 → 409 提示刷新
    const q = expect ? `&name=${encodeURIComponent(expect.name)}&date=${encodeURIComponent(expect.date)}` : "";
    const res = await fetch(`/admin/api/rank?game=${encodeURIComponent(game)}&mode=${encodeURIComponent(mode)}&key=${key}${q}`, { method: "DELETE" });
    return j<{ ok: boolean; msg?: string }>(res);
}

export async function apiClearRank(game: string, mode: string): Promise<{ ok: boolean; msg?: string }> {
    const res = await fetch(`/admin/api/rank?game=${encodeURIComponent(game)}&mode=${encodeURIComponent(mode)}`, { method: "DELETE" });
    return j<{ ok: boolean; msg?: string }>(res);
}

export async function apiLogs(params: { action?: string; actor?: string; limit?: number; offset?: number }): Promise<AuditPage | null> {
    const q = new URLSearchParams();
    if (params.action) q.set("action", params.action);
    if (params.actor) q.set("actor", params.actor);
    q.set("limit", String(params.limit ?? 20));
    q.set("offset", String(params.offset ?? 0));
    const res = await fetch(`/admin/api/logs?${q}`);
    return res.ok ? j<AuditPage>(res) : null;
}

export async function apiSessions(): Promise<SessionInfo[]> {
    const res = await fetch("/admin/api/sessions");
    if (!res.ok) return [];
    const data = await j<{ sessions: SessionInfo[] }>(res);
    return data.sessions ?? [];
}

export async function apiRevokeSession(id: string): Promise<{ ok: boolean; msg?: string }> {
    const res = await fetch(`/admin/api/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    return j<{ ok: boolean; msg?: string }>(res);
}

export async function apiFeedback(q = ""): Promise<FeedbackList | null> {
    const res = await fetch(`/admin/api/feedback?q=${encodeURIComponent(q)}`);
    return res.ok ? j<FeedbackList>(res) : null;
}

export async function apiDeleteFeedback(key: number): Promise<{ ok: boolean; msg?: string }> {
    const res = await fetch(`/admin/api/feedback?key=${key}`, { method: "DELETE" });
    return j<{ ok: boolean; msg?: string }>(res);
}

export async function apiClearFeedback(): Promise<{ ok: boolean; msg?: string }> {
    const res = await fetch(`/admin/api/feedback?clear=1`, { method: "DELETE" });
    return j<{ ok: boolean; msg?: string }>(res);
}

export interface AdminMe {
    ok: boolean;
    actor: string;
    id: string;
    loginAt: number;
    expiresAt: number;
    ip: string;
}
