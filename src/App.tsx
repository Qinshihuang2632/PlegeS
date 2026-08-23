import { Link, Navigate, Route, Routes } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { HubPage } from "./game/HubPage";
import { HuaPage } from "./game/HuaPage";
import { RankPage } from "./game/RankPage";
import { YlgyPage } from "./game2/YlgyPage";
import { FlglPage } from "./game4/FlglPage";
import { NotFoundPage } from "./game/NotFoundPage";

/* 错了个字 · 维护提示页(平台 v2.5.6: 游戏暂时关闭, /clgz 直达链接落在该页;游戏本体代码未改动) */
function ClgzMaintenancePage() {
    return (
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
            <div className="text-5xl" aria-hidden>字</div>
            <h1 className="text-2xl font-extrabold">错了个字 · 维护中</h1>
            <p className="text-muted-foreground">游戏暂时关闭,升级维护中,完成后会重新开放——敬请期待!</p>
            <Button asChild variant="secondary">
                <Link to="/">← 返回游戏大厅</Link>
            </Button>
        </div>
    );
}

export default function App() {
    return (
        <TooltipProvider delayDuration={200}>
            <Routes>
                <Route path="/" element={<HubPage />} />
                <Route path="/hlgx/hua" element={<HuaPage />} />
                <Route path="/hlgx/rank" element={<RankPage />} />
                <Route path="/ylgy" element={<YlgyPage />} />
                {/* v1.4.9: 缩写改名 ws→ylgy, 旧链接 /ws 重定向兼容 */}
                <Route path="/ws" element={<Navigate to="/ylgy" replace />} />
                {/* v2.5.6: 错了个字暂时关闭维护, 直达链接显示维护提示页 */}
                <Route path="/clgz" element={<ClgzMaintenancePage />} />
                {/* v1.0.0 / 平台 v2.6.0: 第四款游戏「分了个类」上线 */}
                <Route path="/flgl" element={<FlglPage />} />
                <Route path="/admin" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Toaster position="top-center" richColors />
        </TooltipProvider>
    );
}
