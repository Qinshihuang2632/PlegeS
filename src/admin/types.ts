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
    score?: number; // v1.0.0: 错了个字得分(手写正确字数)
}

export interface RankList {
    game: string;
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
    id: string;      // v2.8.0: 公开标识(非真实会话 id, 服务端已脱敏)
    current?: boolean;   // v2.8.0: 是否当前登录会话(服务端下发)
    ip: string;
    loginAt: number;
    expiresAt: number;
}

export interface FeedbackEntry {
    name: string;
    content: string;
    credit?: boolean; // v2.5.5: 鸣谢意愿(建议被采纳后是否愿入特别鸣谢榜); 旧条目无此字段
    ip?: string;      // v2.8.5: 真实 IP(管理后台可见); 旧条目无此字段
    ipHash?: string;  // v2.8.0: 匿名化 IP 哈希(防刷对照); 旧条目无此字段
    date: string;
    ts: number;
    key: number; // 管理用索引(存储数组下标)
}

export interface FeedbackList {
    total: number;
    feedback: FeedbackEntry[];
}

/* 游玩记录(未参与排行榜的游玩上报, v2.8.5) */
export interface PlayLogEntry {
    game: string;
    mode: string;
    name: string;
    win: number;
    score: number;
    time: number;
    tools: number;
    version: string;
    platform: string;
    ip: string;
    date: string;
    key: number;
}

export interface PlayLogList {
    total: number;
    list: PlayLogEntry[];
}

/* AI 检测配置(v2.8.4 管理端可配, Key 永不下发明文) */
export interface AiConfig {
    enabled: boolean;
    provider: string;
    model: string;
    apiKeyMasked: string;
    hasKey: boolean;
    source: string;
    updatedAt: string;
}

export interface AiProvider {
    id: string;
    label: string;
    defaultModel: string;
}

/* 审计动作 → 中文标签(文案统一, 展示用) */
export const ACTION_LABELS: Record<string, string> = {
    ai_config_update: "AI 配置更新",
    ai_config_test: "AI 连接测试",
    playlog_clear: "清空游玩记录",
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
