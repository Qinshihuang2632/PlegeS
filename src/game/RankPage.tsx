/*
 * 化了个学 · 排行榜 (/hlgx/rank)
 * 只读展示: 难度切换 / 排序规则说明(可折叠)/ 桌面表格 + 移动端卡片
 * 管理功能(清榜/删除)已全部移入 /admin, 本页不提供任何管理入口
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fmtTime } from "./core";
import { detectPlatform, PLATFORM_LABEL, type Platform } from "./platform";
import { APP_VERSION } from "@/version";
import { WS_VERSION } from "@/game2/version";
import { CLGZ_VERSION } from "@/game3/version";

interface RankEntry {
    name: string;
    hp: number;
    time: number;
    tools: number;
    clears?: number;    // v2.2.0: 成功消除组数(旧条目缺省 0)
    version?: string;   // v2.2.0: 通关版本(旧条目无此字段)
    date: string;
    platform?: Platform;   // 旧条目无此字段 = 端游
    score?: number;     // v1.0.0: 错了个字得分(手写正确字数)
}

const MODES = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "challenge", label: "困难" },
    { mode: "extreme", label: "挑战" },
] as const;

const WS_MODES = [
    { mode: "easy", label: "简单" },
    { mode: "normal", label: "标准" },
    { mode: "hard", label: "困难" },
] as const;

const GAMES = [
    { key: "hlgx", label: "化了个学" },
    { key: "ws", label: "英了个语" },
    { key: "clgz", label: "错了个字" },
] as const;
type GameKey = (typeof GAMES)[number]["key"];

const CLGZ_MODES = [
    { mode: "all", label: "综合" },
] as const;

const MEDALS = ["🥇", "🥈", "🥉"];

export function RankPage() {
    const [searchParams] = useSearchParams();
    // v2.4.2+: 支持 ?game=ws|hlgx|clgz 直达对应游戏榜单(英了个语/错了个字结算页「查看排行榜」直达)
    const [game, setGame] = useState<GameKey>(() => {
        const g = searchParams.get("game");
        return g === "ws" || g === "clgz" ? g : "hlgx";
    });
    const [curMode, setCurMode] = useState<string>("normal");
    const [curPlatform, setCurPlatform] = useState<Platform>(() => detectPlatform());
    const [entries, setEntries] = useState<RankEntry[] | null>(null);
    const [showRules, setShowRules] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setEntries(null);
        setError(false);
        const api = game === "ws" ? "/ws/api/rank" : game === "clgz" ? "/clgz/api/rank" : "/hlgx/api/rank";
        fetch(`${api}?mode=${curMode}&platform=${curPlatform}`)
            .then((res) => res.json())
            .then((data: { rank?: RankEntry[] }) => {
                if (!cancelled) setEntries(data.rank ?? []);
            })
            .catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, [game, curMode, curPlatform]);

    const switchGame = (g: GameKey) => {
        setGame(g);
        setCurMode(g === "ws" ? "normal" : g === "clgz" ? "all" : "normal");
    };

    const rule = game === "ws"
        ? "剩余血量多 → 填写字母数多 → 用时短 → 技能使用次数少(失败记录也会上榜);榜单按平台分开,成绩只与本平台比较;「版本」列为英了个语独立版本"
        : game === "clgz"
            ? "得分多 → 用时短(同分用时短者靠前);榜单按平台分开,成绩只与本平台比较;「版本」列为错了个字独立版本"
            : "剩余血量多 → 成功消除组数多 → 用时短 → 技能使用次数少(失败记录也会上榜,0 心玩家中消除组数多者排前);榜单按平台分开,成绩只与本平台比较;「版本」列对应当局游戏版本,不同版本难度有别,便于横向比较";

    return (
        <div className="mx-auto min-h-dvh w-full max-w-2xl px-3 pb-10 pt-3">
            <header className="mb-3 flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link to="/">← 返回大厅</Link>
                </Button>
                <h1 className="flex-1 text-center text-lg font-extrabold">排行榜</h1>
                <div className="w-16" aria-hidden />
            </header>

            {/* 游戏切换(化了个学 / 英了个语) */}
            <div className="mb-2 flex justify-center gap-1 rounded-full bg-secondary/60 p-1">
                {GAMES.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => switchGame(key)}
                        className={cn(
                            "flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition",
                            game === key ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* 难度切换 */}
            <div className="mb-2 flex justify-center gap-1 rounded-full bg-muted p-1">
                {(game === "ws" ? WS_MODES : game === "clgz" ? CLGZ_MODES : MODES).map(({ mode, label }) => (
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

            {/* 平台切换: 手游/端游榜单分开 */}
            <div className="mb-2 flex justify-center gap-1 rounded-full bg-secondary/60 p-1">
                {(["desktop", "mobile"] as Platform[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => setCurPlatform(p)}
                        className={cn(
                            "flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition",
                            curPlatform === p ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {PLATFORM_LABEL[p]}
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
                <p className="py-10 text-center text-sm text-muted-foreground">暂无记录,快来创造第一条吧</p>
            ) : (
                <>
                    {/* 桌面表格 */}
                    <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-sm sm:block">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                                    <th className="px-4 py-2.5 font-semibold">#</th>
                                    <th className="px-4 py-2.5 font-semibold">昵称</th>
                                    {game === "clgz" ? (
                                        <th className="px-4 py-2.5 font-semibold">得分</th>
                                    ) : (
                                        <th className="px-4 py-2.5 font-semibold">{game === "ws" ? "血量(填写)" : "血量(消除组数)"}</th>
                                    )}
                                    <th className="px-4 py-2.5 font-semibold">用时</th>
                                    <th className="px-4 py-2.5 font-semibold">版本</th>
                                    {game !== "clgz" && <th className="px-4 py-2.5 font-semibold">技能</th>}
                                    <th className="px-4 py-2.5 font-semibold">上榜时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((e, i) => (
                                    <tr key={i} className="border-b border-muted/60 last:border-0">
                                        <td className="px-4 py-2.5">{MEDALS[i] ?? i + 1}</td>
                                        <td className="px-4 py-2.5 font-semibold">{e.name}</td>
                                        <td className="px-4 py-2.5">
                                            {game === "clgz"
                                                ? `${e.score ?? 0} 分`
                                                : `❤ ${e.hp}(${game === "ws" ? (e.clears ?? 0) + "字母" : (e.clears !== undefined ? e.clears + "组" : "—")})`}
                                        </td>
                                        <td className="px-4 py-2.5 tabular-nums">{fmtTime(e.time)}</td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.version || "旧版"}</td>
                                        {game !== "clgz" && <td className="px-4 py-2.5">{e.tools}</td>}
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
                                    {game === "clgz" ? (
                                        <p className="font-semibold">{e.score ?? 0} 分 · ⏱ {fmtTime(e.time)}</p>
                                    ) : (
                                        <p>❤ {e.hp}({game === "ws" ? (e.clears ?? 0) + "字母" : (e.clears !== undefined ? e.clears + "组" : "—")}) · ⏱ {fmtTime(e.time)}</p>
                                    )}
                                    <p className="text-muted-foreground">
                                        {game !== "clgz" && <>技能使用次数 {e.tools} · </>}版本 {e.version || "旧版"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <footer className="mt-8 text-center text-xs text-muted-foreground">
                {game === "ws" ? `英了个语 · ${WS_VERSION}(仅供个人娱乐)` : game === "clgz" ? `错了个字 · ${CLGZ_VERSION}(仅供个人娱乐)` : `化了个学 · ${APP_VERSION}(仅供个人娱乐)`}
            </footer>
        </div>
    );
}
