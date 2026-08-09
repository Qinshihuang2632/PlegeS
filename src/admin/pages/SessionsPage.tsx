/*
 * 化了个学 · 管理后台会话管理
 * 活跃会话列表 / 强制下线(确认弹窗, ✕ 可关), 下线当前会话会立即退出
 */
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../AuthContext";
import { apiRevokeSession, apiSessions } from "../api";
import { ConfirmDialog } from "../ConfirmDialog";
import { fmtTs, type SessionInfo } from "../types";

export function SessionsPage() {
    const { me, logout } = useAuth();
    const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
    const [revokeId, setRevokeId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setSessions(null);
        setSessions(await apiSessions());
    }, []);

    useEffect(() => { void load(); }, [load]);

    const doRevoke = async (id: string) => {
        setBusy(true);
        try {
            const r = await apiRevokeSession(id);
            if (r.ok) {
                toast.success("已强制下线");
                if (id === me?.id) {
                    // 下线的是当前会话 → 登出并回到登录页
                    await logout();
                    return;
                }
                void load();
            } else {
                toast.error(r.msg ?? "操作失败");
            }
        } catch {
            toast.error("网络异常,请稍后再试");
        } finally {
            setBusy(false);
            setRevokeId(null);
        }
    };

    return (
        <div className="mx-auto max-w-4xl space-y-4">
            <header className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-xl font-extrabold">👥 会话管理</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        查看在线会话,可强制下线(会话有效期 24 小时)
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void load()}>
                    <RefreshCw className="h-4 w-4" /> 刷新
                </Button>
            </header>

            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                {sessions === null ? (
                    <div className="space-y-2 p-4">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                ) : sessions.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">当前没有活跃会话</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                                    <th className="px-4 py-2.5 font-semibold">会话号</th>
                                    <th className="px-4 py-2.5 font-semibold">IP</th>
                                    <th className="px-4 py-2.5 font-semibold">登录时间</th>
                                    <th className="px-4 py-2.5 font-semibold">过期时间</th>
                                    <th className="px-4 py-2.5 font-semibold">状态</th>
                                    <th className="px-4 py-2.5 text-right font-semibold">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((s) => {
                                    const isCurrent = s.id === me?.id;
                                    return (
                                        <tr key={s.id} className="border-b border-muted/60 last:border-0">
                                            <td className="px-4 py-2.5 font-mono text-xs">{s.id.slice(0, 12)}…</td>
                                            <td className="px-4 py-2.5 text-xs tabular-nums">{s.ip || "—"}</td>
                                            <td className="px-4 py-2.5 text-xs tabular-nums">{fmtTs(s.loginAt)}</td>
                                            <td className="px-4 py-2.5 text-xs tabular-nums">{fmtTs(s.expiresAt)}</td>
                                            <td className="px-4 py-2.5">
                                                {isCurrent ? (
                                                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                                                        ● 当前会话
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">在线</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    disabled={busy}
                                                    onClick={() => setRevokeId(s.id)}
                                                >
                                                    <ShieldOff className="h-4 w-4" /> 强制下线
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={revokeId !== null}
                onOpenChange={(v) => { if (!v) setRevokeId(null); }}
                title="强制下线该会话?"
                description={revokeId === me?.id ? "这是当前登录的会话,下线后需要重新登录" : "该会话将被立即销毁,此操作不可撤销"}
                confirmText="强制下线"
                destructive
                onConfirm={() => { if (revokeId) void doRevoke(revokeId); }}
            />
        </div>
    );
}
