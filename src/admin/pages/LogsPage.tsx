/*
 * 化了个学 · 管理后台审计日志
 * 动作类型筛选 / 操作者筛选 / 分页, 全部管理操作可追溯
 */
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiLogs } from "../api";
import { actionLabel, ACTION_LABELS, type AuditEntry } from "../types";

const PAGE_SIZE = 20;

export function LogsPage() {
    const [action, setAction] = useState<string>("");
    const [actor, setActor] = useState("");
    const [actorInput, setActorInput] = useState("");
    const [page, setPage] = useState(0);
    const [entries, setEntries] = useState<AuditEntry[] | null>(null);
    const [total, setTotal] = useState(0);

    const load = useCallback(async (act: string, actr: string, p: number) => {
        setEntries(null);
        const data = await apiLogs({
            action: act || undefined,
            actor: actr || undefined,
            limit: PAGE_SIZE,
            offset: p * PAGE_SIZE,
        });
        setEntries(data?.entries ?? []);
        setTotal(data?.total ?? 0);
    }, []);

    useEffect(() => { void load(action, actor, page); }, [action, actor, page, load]);

    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="mx-auto max-w-4xl space-y-4">
            <header>
                <h1 className="text-xl font-extrabold">📜 审计日志</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    登录/登出/删榜/清榜/下线等管理操作全程留痕(最多保留 500 条)
                </p>
            </header>

            {/* 筛选 */}
            <div className="flex flex-wrap items-center gap-2">
                <Select value={action} onValueChange={(v) => { setAction(v); setPage(0); }}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="全部动作" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value=" ">全部动作</SelectItem>
                        {Object.entries(ACTION_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <form
                    className="flex gap-2"
                    onSubmit={(e) => { e.preventDefault(); setActor(actorInput.trim()); setPage(0); }}
                >
                    <Input
                        placeholder="按操作者筛选"
                        className="w-40"
                        value={actorInput}
                        onChange={(e) => setActorInput(e.target.value)}
                    />
                    <Button type="submit" variant="secondary"><Search className="h-4 w-4" /> 筛选</Button>
                </form>
            </div>

            {/* 日志表格 */}
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                {entries === null ? (
                    <div className="space-y-2 p-4">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                ) : entries.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">没有符合条件的日志</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                                    <th className="px-4 py-2.5 font-semibold">时间</th>
                                    <th className="px-4 py-2.5 font-semibold">操作者</th>
                                    <th className="px-4 py-2.5 font-semibold">动作</th>
                                    <th className="px-4 py-2.5 font-semibold">详情</th>
                                    <th className="px-4 py-2.5 font-semibold">IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((e, i) => (
                                    <tr key={e.ts + "-" + i} className="border-b border-muted/60 last:border-0">
                                        <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums">{e.time}</td>
                                        <td className="px-4 py-2.5">{e.actor}</td>
                                        <td className="px-4 py-2.5">
                                            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                                                {actionLabel(e.action)}
                                            </span>
                                        </td>
                                        <td className="max-w-[18rem] truncate px-4 py-2.5 text-xs text-muted-foreground" title={e.detail}>
                                            {e.detail}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs tabular-nums">{e.ip}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="tabular-nums">共 {total} 条 · 第 {page + 1}/{pages} 页</span>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-4 w-4" /> 上一页
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
                        下一页 <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
