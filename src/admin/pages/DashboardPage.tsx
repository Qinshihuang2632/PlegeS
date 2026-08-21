/*
 * p了个s · 管理后台数据看板
 * 三款游戏榜单条目统计 / 总条目 / 活跃会话 / 最近审计事件
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../AuthContext";
import { apiLogs, apiRanks } from "../api";
import { actionLabel, fmtTs, type AuditEntry } from "../types";

/** 三款游戏及其难度(用于看板统计) */
const GAME_STATS = [
    { game: "hlgx", label: "化了个学", modes: ["easy", "normal", "challenge", "extreme"] },
    { game: "ylgy", label: "英了个语", modes: ["easy", "normal", "hard"] },
    { game: "clgz", label: "错了个字", modes: ["all"] },
] as const;

export function DashboardPage() {
    const { me } = useAuth();
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [recent, setRecent] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            const calls = GAME_STATS.flatMap((g) => g.modes.map((m) => apiRanks(g.game, m)));
            const results = await Promise.all([...calls, apiLogs({ limit: 5 })]);
            if (!alive) return;
            const rankResults = results.slice(0, calls.length) as ({ total?: number } | null)[];
            const logs = results[calls.length] as { entries?: AuditEntry[] } | null;
            const c: Record<string, number> = {};
            let i = 0;
            for (const g of GAME_STATS) {
                for (const m of g.modes) {
                    c[`${g.game}:${m}`] = rankResults[i]?.total ?? 0;
                    i++;
                }
            }
            setCounts(c);
            setRecent(logs?.entries ?? []);
            setLoading(false);
        })();
        return () => { alive = false; };
    }, []);

    const total = GAME_STATS.reduce(
        (sum, g) => sum + g.modes.reduce((s, m) => s + (counts[`${g.game}:${m}`] ?? 0), 0), 0);

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <header>
                <h1 className="text-xl font-extrabold">📊 数据看板</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    管理员 · 登录于 {me ? fmtTs(me.loginAt) : "—"}(IP {me?.ip ?? "—"})
                </p>
            </header>

            {/* 三游戏统计卡片 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {GAME_STATS.map((g) => (
                    <Card key={g.game}>
                        <CardHeader className="pb-1">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{g.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-8 w-12" /> : (
                                <p className="text-3xl font-extrabold tabular-nums">
                                    {g.modes.reduce((s, m) => s + (counts[`${g.game}:${m}`] ?? 0), 0)}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">条记录({g.modes.map((m) => m).join("/")})</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* 汇总条 */}
            <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                        <p className="text-2xl font-extrabold tabular-nums">{total}</p>
                        <p className="text-xs text-muted-foreground">全部榜单累计记录</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                        <p>🎮 游戏: 化了个学 / 英了个语 / 错了个字</p>
                        <p>🕑 管理会话有效期: 24 小时</p>
                        <p>🗂 审计日志上限: 500 条(自动滚动)</p>
                    </div>
                </CardContent>
            </Card>

            {/* 最近审计事件 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">最近审计事件(5 条)</CardTitle>
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
