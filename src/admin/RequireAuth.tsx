/*
 * p了个s · 管理后台路由守卫
 * 挂载时请求 /admin/api/auth, 未登录重定向 /admin/login
 */
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./AuthContext";

export function RequireAuth() {
    const { me, refresh } = useAuth();
    const location = useLocation();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let alive = true;
        refresh().finally(() => { if (alive) setChecking(false); });
        return () => { alive = false; };
    }, [refresh]);

    if (checking) {
        return (
            <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
                🔒 正在校验登录状态…
            </div>
        );
    }
    if (!me) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }
    return <Outlet />;
}
