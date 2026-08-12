/*
 * 化了个学 · 管理后台登录页
 * 输入管理员令牌登录(错误提示/剩余次数/锁定提示), 登录成功跳看板
 */
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../AuthContext";

export function LoginPage() {
    const { me, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (me) return <Navigate to="/dashboard" replace />;
    const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        if (!token.trim()) { setError("请输入管理员令牌"); return; }
        setBusy(true);
        setError("");
        try {
            const r = await login(token.trim());
            if (r.ok) navigate(from, { replace: true });
            else setError(r.msg || "登录失败");
        } catch {
            setError("网络异常,请稍后再试");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex min-h-dvh items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm">
                <div className="mb-6 text-center">
                    <p className="text-4xl" aria-hidden>化</p>
                    <h1 className="mt-2 text-xl font-extrabold">化了个学 · 管理后台</h1>
                    <p className="mt-1 text-sm text-muted-foreground">请输入管理员令牌后进入</p>
                </div>
                <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
                    <div className="space-y-1.5">
                        <Label htmlFor="admin-token">管理员令牌</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="admin-token"
                                type="password"
                                autoFocus
                                autoComplete="off"
                                placeholder="请输入令牌"
                                className="pl-9"
                                value={token}
                                onChange={(e) => { setToken(e.target.value); setError(""); }}
                            />
                        </div>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" size="lg" disabled={busy}>
                        {busy ? "登录中…" : "登 录"}
                    </Button>
                </form>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                    令牌由管理员配置,连续输错 5 次将锁定 15 分钟
                </p>
            </div>
        </div>
    );
}
