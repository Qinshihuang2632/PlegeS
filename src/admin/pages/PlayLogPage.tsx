/*
 * p了个s · 管理后台游玩记录
 * 未参与排行榜的游玩数据(未填昵称/勾选不参与): 按游玩时间先后列出, 含真实 IP(管理员可见)。
 * 游戏筛选 / 昵称搜索 / 清空全部(确认弹窗, 全程审计)。
 */
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClearPlayLog, apiPlayLogs } from "../api";
import { ConfirmDialog } from "../ConfirmDialog";
import type { PlayLogEntry } from "../types";

const GAME_OPTIONS = [
    { id: "", label: "全部游戏" },
    { id: "hlgx", label: "化了个学" },
    { id: "ylgy", label: "英了个语" },
    { id: "flgl", label: "分了个类" },
    { id: "plgp", label: "配了个平" },
];
const GAME_LABEL: Record<string, string> = Object.fromEntries(GAME_OPTIONS.filter(o => o.id).map(o => [o.id, o.label]));

export function PlayLogPage() {
    const [game, setGame] = useState("");
    const [q, setQ] = useState("");
    const [search, setSearch] = useState("");
    const [list, setList] = useState<PlayLogEntry[] | null>(null);
    const [clearOpen, setClearOpen] = useState(false);

    const load = useCallback(async (g: string, kw: string) => {
        setList(null);
        const data = await apiPlayLogs(g, kw);
        setList(data?.list ?? []);
    }, []);

    useEffect(() => { void load(game, search); }, [game, search, load]);

    const doClear = async () => {
        try {
            const r = await apiClearPlayLog();
            if (r.ok) { toast.success(r.msg ?? "已清空"); void load(game, search); }
            else toast.error(r.msg ?? "操作失败");
        } catch {
            toast.error("网络异常,请稍后再试");
        } finally {
            setClearOpen(false);
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-4">
            <header className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-xl font-extrabold">游玩记录</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        未参与排行榜的游玩数据(未填昵称或勾选不参与),按游玩时间先后列出;含提交时的 IP
                    </p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setClearOpen(true)} disabled={list?.length === 0}>
                    清空全部
                </Button>
            </header>

            {/* 筛选: 游戏 + 昵称搜索 */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1 rounded-full bg-muted p-1">
                    {GAME_OPTIONS.map(o => (
                        <button key={o.id} onClick={() => setGame(o.id)}
                            className={cn_tab(game === o.id)}>
                            {o.label}
                        </button>
                    ))}
                </div>
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }}>
                    <Input placeholder="按昵称搜索" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-40" />
                    <Button type="submit" variant="secondary" size="sm"><Search className="h-4 w-4" /> 搜索</Button>
                    {search && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(""); setQ(""); }}>清除</Button>
                    )}
                </form>
            </div>

            {/* 表格(新记录在上, 即最近游玩在前) */}
            <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
                {list === null ? (
                    <div className="space-y-2 p-4">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                ) : list.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                        暂无游玩记录(未参与排行榜的玩家对局结算后会出现)
                    </p>
                ) : (
                    <table className="w-full min-w-[42rem] text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                                <th className="px-3 py-2 font-semibold">游戏</th>
                                <th className="px-3 py-2 font-semibold">难度</th>
                                <th className="px-3 py-2 font-semibold">昵称</th>
                                <th className="px-3 py-2 font-semibold">结果</th>
                                <th className="px-3 py-2 font-semibold">成绩</th>
                                <th className="px-3 py-2 font-semibold">用时</th>
                                <th className="px-3 py-2 font-semibold">版本</th>
                                <th className="px-3 py-2 font-semibold">平台</th>
                                <th className="px-3 py-2 font-semibold">IP</th>
                                <th className="px-3 py-2 font-semibold">游玩时间</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-muted/60">
                            {list.map((e, i) => (
                                <tr key={e.key ?? i} className="hover:bg-muted/30">
                                    <td className="px-3 py-2 font-medium">{GAME_LABEL[e.game] ?? e.game}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{e.mode}</td>
                                    <td className="px-3 py-2">{e.name || <span className="text-muted-foreground">—</span>}</td>
                                    <td className="px-3 py-2">
                                        <span className={e.win ? "text-success" : "text-destructive"}>{e.win ? "通关" : "失败"}</span>
                                    </td>
                                    <td className="px-3 py-2 tabular-nums">{e.score}</td>
                                    <td className="px-3 py-2 tabular-nums">{e.time}s</td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground">{e.version || "—"}</td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground">{e.platform === "mobile" ? "手游" : "端游"}</td>
                                    <td className="px-3 py-2 font-mono text-xs">{e.ip || "—"}</td>
                                    <td className="px-3 py-2 tabular-nums text-xs text-muted-foreground">{e.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <ConfirmDialog
                open={clearOpen}
                onOpenChange={setClearOpen}
                title="清空全部游玩记录"
                description={`将删除全部 ${list?.length ?? 0} 条记录,不可恢复`}
                confirmText="清空"
                destructive
                onConfirm={() => void doClear()}
            />
        </div>
    );
}

function cn_tab(active: boolean): string {
    return (
        "rounded-full px-3 py-1.5 text-sm font-semibold transition " +
        (active ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground")
    );
}
