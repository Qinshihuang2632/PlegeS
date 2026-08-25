/*
 * p了个s · 管理后台榜单管理
 * 游戏切换(化了个学/英了个语/错了个字, 各自独立)/ 难度切换 / 昵称搜索 /
 * 单条删除 / 清空当前难度 / 清空该游戏全部(均需确认弹窗, ✕ 可关)
 */
import { useCallback, useEffect, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiClearRank, apiDeleteRankEntry, apiRanks } from "../api";
import { ConfirmDialog } from "../ConfirmDialog";
import type { RankEntry } from "../types";
import { fmtTime } from "@/game/core";

const GAMES = [
    { key: "hlgx", label: "化了个学", modes: [
        { mode: "easy", label: "简单" },
        { mode: "normal", label: "标准" },
        { mode: "challenge", label: "困难" },
        { mode: "extreme", label: "挑战" },
    ] },
    { key: "ylgy", label: "英了个语", modes: [
        { mode: "easy", label: "简单" },
        { mode: "normal", label: "标准" },
        { mode: "hard", label: "困难" },
    ] },
    { key: "clgz", label: "错了个字", modes: [
        { mode: "all", label: "综合" },
    ] },
    { key: "flgl", label: "分了个类", modes: [
        { mode: "easy", label: "简单" },
        { mode: "normal", label: "标准" },
        { mode: "hard", label: "困难" },
    ] },
    { key: "plgp", label: "配了个平", modes: [
        { mode: "easy", label: "简单" },
        { mode: "normal", label: "标准" },
        { mode: "hard", label: "困难" },
    ] },
] as const;
type GameKey = (typeof GAMES)[number]["key"];

type ConfirmState =
    | { type: "delete"; entry: RankEntry }
    | { type: "clearMode" }
    | { type: "clearAll" }
    | null;

export function RanksPage() {
    const [curGame, setCurGame] = useState<GameKey>("hlgx");
    const game = GAMES.find((g) => g.key === curGame)!;
    const [curMode, setCurMode] = useState("easy");
    const [q, setQ] = useState("");
    const [search, setSearch] = useState("");
    const [entries, setEntries] = useState<RankEntry[] | null>(null);
    const [confirm, setConfirm] = useState<ConfirmState>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async (g: string, mode: string, keyword: string) => {
        setEntries(null);
        const data = await apiRanks(g, mode, keyword);
        setEntries(data?.rank ?? []);
    }, []);

    useEffect(() => { void load(curGame, curMode, search); }, [curGame, curMode, search, load]);

    const switchGame = (g: GameKey) => {
        setCurGame(g);
        setCurMode(GAMES.find((x) => x.key === g)!.modes[0].mode);
        setSearch(""); setQ("");
    };

    const doAction = async (fn: () => Promise<{ ok: boolean; msg?: string }>, okMsg?: string) => {
        setBusy(true);
        try {
            const r = await fn();
            if (r.ok) {
                toast.success(okMsg ?? "操作成功");
                void load(curGame, curMode, search);
            } else {
                toast.error(r.msg ?? "操作失败");
            }
        } catch {
            toast.error("网络异常,请稍后再试");
        } finally {
            setBusy(false);
            setConfirm(null);
        }
    };

    const isScore = curGame === "clgz" || curGame === "flgl";   // 得分制游戏(错了个字/分了个类): 显示得分列、无技能列(plgp 有技能列)

    return (
        <div className="mx-auto max-w-4xl space-y-4">
            <header className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-xl font-extrabold">榜单管理</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">三款游戏榜单独立管理:查看/搜索/删除记录,清榜操作全程留痕</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirm({ type: "clearMode" })}>
                        清空当前榜单
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setConfirm({ type: "clearAll" })}>
                        清空该游戏全部
                    </Button>
                </div>
            </header>

            {/* 游戏切换(三款游戏独立榜单) */}
            <div className="flex justify-center gap-1 rounded-full bg-secondary/60 p-1 sm:justify-start sm:rounded-lg sm:bg-transparent sm:p-0">
                {GAMES.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => switchGame(key)}
                        className={cn(
                            "flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition sm:flex-none",
                            curGame === key ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* 难度切换 */}
            <div className="flex justify-center gap-1 rounded-full bg-muted p-1 sm:justify-start sm:rounded-lg sm:bg-transparent sm:p-0">
                {game.modes.map(({ mode, label }) => (
                    <button
                        key={mode}
                        onClick={() => { setCurMode(mode); setSearch(""); setQ(""); }}
                        className={cn(
                            "flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition sm:flex-none",
                            curMode === mode ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* 搜索 */}
            <form
                className="flex gap-2"
                onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }}
            >
                <Input
                    placeholder="按昵称搜索"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="max-w-xs"
                />
                <Button type="submit" variant="secondary"><Search className="h-4 w-4" /> 搜索</Button>
                {search && (
                    <Button type="button" variant="ghost" onClick={() => { setSearch(""); setQ(""); }}>
                        清除
                    </Button>
                )}
            </form>

            {/* 榜单表格 */}
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                {entries === null ? (
                    <div className="space-y-2 p-4">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                ) : entries.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                        {search ? "没有匹配的记录" : "该难度暂无记录"}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                                    <th className="px-4 py-2.5 font-semibold">#</th>
                                    <th className="px-4 py-2.5 font-semibold">昵称</th>
                                    <th className="px-4 py-2.5 font-semibold">平台</th>
                                    {isScore ? (
                                        <th className="px-4 py-2.5 font-semibold">得分</th>
                                    ) : (
                                        <th className="px-4 py-2.5 font-semibold">{curGame === "ylgy" ? "血量(填写字母)" : "血量(消除组数)"}</th>
                                    )}
                                    <th className="px-4 py-2.5 font-semibold">用时</th>
                                    <th className="px-4 py-2.5 font-semibold">版本</th>
                                    {!isScore && <th className="px-4 py-2.5 font-semibold">技能</th>}
                                    <th className="px-4 py-2.5 font-semibold">上榜时间</th>
                                    <th className="px-4 py-2.5 text-right font-semibold">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((e, i) => (
                                    <tr key={e.key} className="border-b border-muted/60 last:border-0">
                                        <td className="px-4 py-2.5">{i + 1}</td>
                                        <td className="max-w-[10rem] truncate px-4 py-2.5 font-semibold">{e.name}</td>
                                        <td className="px-4 py-2.5 text-xs">
                                            {e.platform === "mobile"
                                                ? <span className="rounded-full bg-secondary px-2 py-0.5">手游</span>
                                                : <span className="rounded-full bg-secondary px-2 py-0.5">端游</span>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {isScore
                                                ? `${e.score ?? 0} 分`
                                                : `❤ ${e.hp}(${curGame === "ylgy" ? (e.clears ?? 0) + "字母" : (e.clears !== undefined ? e.clears + "组" : "—")})`}
                                        </td>
                                        <td className="px-4 py-2.5 tabular-nums">{fmtTime(e.time)}</td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.version || "旧版"}</td>
                                        {!isScore && <td className="px-4 py-2.5">{e.tools}</td>}
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.date}</td>
                                        <td className="px-4 py-2.5 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                disabled={busy}
                                                onClick={() => setConfirm({ type: "delete", entry: e })}
                                            >
                                                <Trash2 className="h-4 w-4" /> 删除
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {entries !== null && (
                <p className="text-right text-xs text-muted-foreground">共 {entries.length} 条{search ? `(搜索: ${search})` : ""}</p>
            )}

            {/* 确认弹窗 */}
            <ConfirmDialog
                open={confirm !== null}
                onOpenChange={(v) => { if (!v) setConfirm(null); }}
                title={
                    confirm?.type === "delete" ? "删除该记录?"
                        : confirm?.type === "clearMode" ? `清空「${game.label} · ${game.modes.find((m) => m.mode === curMode)?.label}」榜单?`
                        : `清空「${game.label}」全部榜单?`
                }
                description={
                    confirm?.type === "delete"
                        ? `将删除 ${confirm.entry.name} 的记录(${isScore ? `得分 ${confirm.entry.score ?? 0}` : `血量 ${confirm.entry.hp}`} / 用时 ${fmtTime(confirm.entry.time)}),此操作不可撤销`
                        : confirm?.type === "clearMode"
                            ? "该难度的全部记录将被清空,此操作不可撤销"
                            : `该游戏(${game.label})的全部难度记录将被清空,此操作不可撤销`
                }
                confirmText={confirm?.type === "delete" ? "删除" : "清空"}
                destructive
                onConfirm={() => {
                    if (confirm?.type === "delete") {
                        void doAction(() => apiDeleteRankEntry(curGame, curMode, confirm.entry.key), "记录已删除");
                    } else if (confirm?.type === "clearMode") {
                        void doAction(() => apiClearRank(curGame, curMode), "榜单已清空");
                    } else if (confirm?.type === "clearAll") {
                        void doAction(() => apiClearRank(curGame, "all"), "全部榜单已清空");
                    }
                }}
            />
        </div>
    );
}
