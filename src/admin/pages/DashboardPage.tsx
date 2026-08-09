/*
 * 化了个学 · 管理后台数据看板
 * 各难度条目数 / 总条目 / 活跃会话 / 最近审计事件
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../AuthContext";
import { apiLogs, apiRanks, apiSessions } from "../api";
import { actionLabel, fmtTs, type AuditEntry } from "../types";

const MODES = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "challenge", label: "挑战" },
];

export function DashboardPage() {
    const { me } = useAuth();
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [sessionCount, setSessionCount] = useState<number | null>(null);
    const [recent, setRecent] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            const [a, b, c, sessions, logs] = await Promise.all([
                apiRanks("easy"), apiRanks("normal"), apiRanks("challenge"),
                apiSessions(), apiLogs({ limit: 5 }),
            ]);
            if (!alive) return;
            setCounts({
                easy: a?.total ?? 0,
                normal: b?.total ?? 0,
                challenge: c?.total ?? 0,
            });
            setSessionCount(sessions.length);
            setRecent(logs?.entries ?? []);
            setLoading(false);
        })();
        return () => { alive = false; };
    }, []);

    const total = (counts.easy ?? 0) + (counts.normal ?? 0) + (counts.challenge ?? 0);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <header>
                <h1 className="text-xl font-extrabold">📊 数据看板</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    管理员 · 登录于 {me ? fmtTs(me.loginAt) : "—"}(IP {me?.ip ?? "—"})
                </p>
            </header>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {MODES.map(({ mode, label }) => (
                    <Card key={mode}>
                        <CardHeader className="pb-1">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {label}榜单
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-8 w-12" /> : (
                                <p className="text-3xl font-extrabold tabular-nums">{counts[mode] ?? 0}</p>
                            )}
                            <p className="text-xs text-muted-foreground">条记录</p>
                        </CardContent>
                    </Card>
                ))}
                <Card>
                    <CardHeader className="pb-1">
                        <CardTitle className="text-sm font-medium text-muted-foreground">活跃会话</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-12" /> : (
                            <p className="text-3xl font-extrabold tabular-nums">{sessionCount}</p>
                        )}
                        <p className="text-xs text-muted-foreground">在线管理员</p>
                    </CardContent>
                </Card>
            </div>

            {/* 汇总条 */}
            <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                        <p className="text-2xl font-extrabold tabular-nums">{total}</p>
                        <p className="text-xs text-muted-foreground">全部榜单累计记录</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                        <p>🎮 游戏: 化了个学(消除玩法)</p>
                        <p>🕑 管理会话有效期: 24 小时</p>
                        <p>🗂 审计日志上限: 500 条(自动滚动)</p>
                    </div>
                </CardContent>
            </Card>

            {/* 最近审计事件 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">🕐 最近审计事件(5 条)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    ) : recent.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">暂无审计记录</p>
                    ) : (
                        recent.map((e, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm">
                                <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">{e.time}</span>
                                <span className="shrink-0 font-medium">{actionLabel(e.action)}</span>
                                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{e.detail}</span>
                                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{e.ip}</span>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
