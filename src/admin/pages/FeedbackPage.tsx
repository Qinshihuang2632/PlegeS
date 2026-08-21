/*
 * p了个s · 管理后台建议反馈
 * 玩家提交的建议反馈列表(新在前): 搜索 / 单条删除 / 清空全部(均需确认弹窗, ✕ 可关)
 */
import { useCallback, useEffect, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClearFeedback, apiDeleteFeedback, apiFeedback } from "../api";
import { ConfirmDialog } from "../ConfirmDialog";
import type { FeedbackEntry } from "../types";

type ConfirmState = { type: "delete"; entry: FeedbackEntry } | { type: "clear" } | null;

export function FeedbackPage() {
    const [q, setQ] = useState("");
    const [search, setSearch] = useState("");
    const [list, setList] = useState<FeedbackEntry[] | null>(null);
    const [confirm, setConfirm] = useState<ConfirmState>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async (keyword: string) => {
        setList(null);
        const data = await apiFeedback(keyword);
        setList(data?.feedback ?? []);
    }, []);

    useEffect(() => { void load(search); }, [search, load]);

    const doAction = async (fn: () => Promise<{ ok: boolean; msg?: string }>, okMsg?: string) => {
        setBusy(true);
        try {
            const r = await fn();
            if (r.ok) {
                toast.success(okMsg ?? "操作成功");
                void load(search);
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

    return (
        <div className="mx-auto max-w-4xl space-y-4">
            <header className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-xl font-extrabold">建议反馈</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">玩家提交的建议与反馈,可按昵称/内容搜索,删除/清空全程留痕</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setConfirm({ type: "clear" })}>
                    清空全部
                </Button>
            </header>

            {/* 搜索 */}
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }}>
                <Input
                    placeholder="按昵称或内容搜索"
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

            {/* 列表 */}
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                {list === null ? (
                    <div className="space-y-2 p-4">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : list.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                        {search ? "没有匹配的反馈" : "暂无反馈,快去主界面鼓励玩家提建议吧"}
                    </p>
                ) : (
                    <ul className="divide-y divide-muted/60">
                        {list.map((e) => (
                            <li key={e.key} className="flex items-start gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold">{e.name}</span>
                                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{e.ip}</span>
                                        <span className="text-xs text-muted-foreground tabular-nums">{e.date}</span>
                                    </div>
                                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{e.content}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0 text-destructive hover:text-destructive"
                                    disabled={busy}
                                    onClick={() => setConfirm({ type: "delete", entry: e })}
                                >
                                    <Trash2 className="h-4 w-4" /> 删除
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {list !== null && (
                <p className="text-right text-xs text-muted-foreground">共 {list.length} 条{search ? `(搜索: ${search})` : ""}</p>
            )}

            {/* 确认弹窗 */}
            <ConfirmDialog
                open={confirm !== null}
                onOpenChange={(v) => { if (!v) setConfirm(null); }}
                title={confirm?.type === "delete" ? "删除该反馈?" : "清空全部反馈?"}
                description={
                    confirm?.type === "delete"
                        ? `将删除 ${confirm.entry.name} 的反馈:${String(confirm.entry.content).slice(0, 40)}…,此操作不可撤销`
                        : "全部反馈将被清空,此操作不可撤销"
                }
                confirmText={confirm?.type === "delete" ? "删除" : "清空"}
                destructive
                onConfirm={() => {
                    if (confirm?.type === "delete") {
                        void doAction(() => apiDeleteFeedback(confirm.entry.key), "反馈已删除");
                    } else if (confirm?.type === "clear") {
                        void doAction(() => apiClearFeedback(), "全部反馈已清空");
                    }
                }}
            />
        </div>
    );
}
