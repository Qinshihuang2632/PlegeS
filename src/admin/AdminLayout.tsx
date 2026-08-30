/*
 * p了个s · 管理后台布局
 * 桌面: 左侧边栏导航 + 顶栏(管理员标识/退出登录)
 * 移动端: 顶栏 + 底部导航(微信小程序风格), 内容区留出底部空间
 */
import { NavLink, Outlet } from "react-router";
import { LayoutDashboard, LogOut, MessageSquare, ScrollText, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthContext";
import { fmtTs } from "./types";

const NAV = [
    { to: "/dashboard", label: "数据看板", icon: LayoutDashboard },
    { to: "/ranks", label: "榜单管理", icon: Trophy },
    { to: "/feedback", label: "建议反馈", icon: MessageSquare },
    { to: "/logs", label: "审计日志", icon: ScrollText },
    { to: "/sessions", label: "会话管理", icon: Users },
];

export function AdminLayout() {
    const { me, logout } = useAuth();

    const navCls = ({ isActive }: { isActive: boolean }) =>
        cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
            isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        );

    return (
        <div className="min-h-dvh bg-background">
            {/* 桌面侧边栏 */}
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r bg-card p-4 md:flex">
                <div className="mb-6 flex items-center gap-2 px-1">
                    <div>
                        <p className="text-sm font-bold leading-tight">p了个s</p>
                        <p className="text-xs text-muted-foreground">管理后台</p>
                    </div>
                </div>
                <nav className="flex-1 space-y-1">
                    {NAV.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={to} className={navCls}>
                            <Icon className="h-4 w-4" />
                            {label}
                        </NavLink>
                    ))}
                </nav>
                <div className="space-y-2 border-t pt-3">
                    <p className="px-1 text-xs text-muted-foreground">
                        管理员 · 登录于 {me ? fmtTs(me.loginAt) : "—"}
                    </p>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => void logout()}>
                        <LogOut className="h-4 w-4" /> 退出登录
                    </Button>
                </div>
            </aside>

            {/* 移动端顶栏 */}
            <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/90 px-4 py-3 backdrop-blur md:hidden">
                <p className="text-sm font-bold">p了个s · 管理后台</p>
                <Button variant="ghost" size="sm" onClick={() => void logout()}>
                    <LogOut className="h-4 w-4" /> 退出
                </Button>
            </header>

            {/* 内容区 */}
            <main className="px-4 pb-24 pt-4 md:ml-56 md:px-8 md:pb-10 md:pt-8">
                <Outlet />
            </main>

            {/* 移动端底部导航 */}
            <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
                {NAV.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} className={({ isActive }) =>
                        cn(
                            "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                            isActive ? "text-primary" : "text-muted-foreground",
                        )}
                    >
                        <Icon className="h-5 w-5" />
                        {label}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
