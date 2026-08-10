/* 管理后台共享类型 */
export type Platform = "mobile" | "desktop";

export interface RankEntry {
    name: string;
    hp: number;
    time: number;
    tools: number;
    clears?: number; // v2.2.0: 成功消除组数(旧条目缺省 0)
    version?: string; // v2.2.0: 通关版本(旧条目无此字段)
    date: string;
    key: number; // 管理用索引(存储数组下标)
    platform?: Platform; // 手游/端游; 旧条目无此字段 = 端游
}

export interface RankList {
    mode: string;
    total: number;
    rank: RankEntry[];
}

export interface AuditEntry {
    ts: number;
    time: string;
    actor: string;
    action: string;
    detail: string;
    ip: string;
}

export interface AuditPage {
    total: number;
    offset: number;
    limit: number;
    entries: AuditEntry[];
}

export interface SessionInfo {
    id: string;
    ip: string;
    loginAt: number;
    expiresAt: number;
}

/* 审计动作 → 中文标签(文案统一, 展示用) */
export const ACTION_LABELS: Record<string, string> = {
    login_success: "登录成功",
    login_fail: "登录失败",
    logout: "退出登录",
    session_revoke: "强制下线",
    rank_delete_one: "删除记录",
    rank_clear_mode: "清空榜单",
    rank_clear_all: "清空全部",
};

export function actionLabel(a: string): string {
    return ACTION_LABELS[a] ?? a;
}

/* 时间戳 → 本地时间显示 */
export function fmtTs(ts: number): string {
    const d = new Date(ts);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
