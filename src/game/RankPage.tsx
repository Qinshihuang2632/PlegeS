/*
 * 化了个学 · 排行榜 (/hlgx/rank)
 * 只读展示: 难度切换 / 排序规则说明(可折叠)/ 桌面表格 + 移动端卡片
 * 管理功能(清榜/删除)已全部移入 /admin, 本页不提供任何管理入口
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fmtTime } from "./core";

interface RankEntry {
    name: string;
    hp: number;
    time: number;
    tools: number;
    date: string;
}

const MODES = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "challenge", label: "挑战" },
] as const;

const MEDALS = ["🥇", "🥈", "🥉"];

export function RankPage() {
    const [curMode, setCurMode] = useState<"easy" | "normal" | "challenge">("normal");
    const [entries, setEntries] = useState<RankEntry[] | null>(null);
    const [showRules, setShowRules] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setEntries(null);
        setError(false);
        fetch(`/hlgx/api/rank?mode=${curMode}`)
            .then((res) => res.json())
            .then((data: { rank?: RankEntry[] }) => {
                if (!cancelled) setEntries(data.rank ?? []);
            })
            .catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, [curMode]);

    const rule = "剩余血量多 → 用时短 → 技能使用次数少(失败记录也会上榜)";

    return (
        <div className="mx-auto min-h-dvh w-full max-w-2xl px-3 pb-10 pt-3">
            <header className="mb-3 flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link to="/">← 返回大厅</Link>
                </Button>
                <h1 className="flex-1 text-center text-lg font-extrabold">🏆 排行榜</h1>
                <div className="w-16" aria-hidden />
            </header>

            {/* 难度切换 */}
            <div className="mb-2 flex justify-center gap-1 rounded-full bg-muted p-1">
                {MODES.map(({ mode, label }) => (
                    <button
                        key={mode}
                        onClick={() => setCurMode(mode)}
                        className={cn(
                            "flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition",
                            curMode === mode ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* 排序规则说明(可折叠) */}
            <button
                onClick={() => setShowRules(!showRules)}
                className="mb-3 w-full rounded-lg px-3 py-2 text-center text-xs text-muted-foreground transition hover:bg-muted"
                aria-expanded={showRules}
            >
                {showRules ? "▾ " : "▸ "}排名规则:点击查看
            </button>
            {showRules && (
                <p className="mb-3 rounded-xl bg-muted/60 p-3 text-center text-xs leading-relaxed text-muted-foreground">
                    {rule}
                    <br />
                    闯关失败也会上榜;想隐藏成绩,开局时可勾选「不参与排行榜」。
                </p>
            )}

            {/* 榜单 */}
            {error ? (
                <p className="py-10 text-center text-sm text-muted-foreground">加载失败,请检查网络后重试</p>
            ) : entries === null ? (
                <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}
                </div>
            ) : entries.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">暂无记录,快来创造第一条吧 🧪</p>
            ) : (
                <>
                    {/* 桌面表格 */}
                    <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-sm sm:block">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                                    <th className="px-4 py-2.5 font-semibold">#</th>
                                    <th className="px-4 py-2.5 font-semibold">昵称</th>
                                    <th className="px-4 py-2.5 font-semibold">血量</th>
                                    <th className="px-4 py-2.5 font-semibold">用时</th>
                                    <th className="px-4 py-2.5 font-semibold">技能</th>
                                    <th className="px-4 py-2.5 font-semibold">上榜时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((e, i) => (
                                    <tr key={i} className="border-b border-muted/60 last:border-0">
                                        <td className="px-4 py-2.5">{MEDALS[i] ?? i + 1}</td>
                                        <td className="px-4 py-2.5 font-semibold">{e.name}</td>
                                        <td className="px-4 py-2.5">❤ {e.hp}</td>
                                        <td className="px-4 py-2.5 tabular-nums">{fmtTime(e.time)}</td>
                                        <td className="px-4 py-2.5">{e.tools}</td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 移动端卡片列表 */}
                    <div className="space-y-2 sm:hidden">
                        {entries.map((e, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm">
                                <span className="w-8 text-center text-lg">{MEDALS[i] ?? i + 1}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">{e.name}</p>
                                    <p className="text-xs text-muted-foreground">{e.date}</p>
                                </div>
                                <div className="text-right text-xs leading-relaxed">
                                    <p>❤ {e.hp} · ⏱ {fmtTime(e.time)}</p>
                                    <p className="text-muted-foreground">技能 {e.tools} 次</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <footer className="mt-8 text-center text-xs text-muted-foreground">化了个学 · v2.1.0(仅供个人娱乐)</footer>
        </div>
    );
}
