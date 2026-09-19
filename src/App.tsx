import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HubPage } from "./game/HubPage";
import { HuaPage } from "./game/HuaPage";
import { RankPage } from "./game/RankPage";
import { YlgyPage } from "./game2/YlgyPage";
import { FlglPage } from "./game4/FlglPage";
import { PlgpPage } from "./game5/PlgpPage";
import { LlgsPage } from "./game7/LlgsPage";
import { ClgzPage } from "./game3/ClgzPage";
import { NotFoundPage } from "./game/NotFoundPage";

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
                <Route path="/clgz" element={<ClgzPage />} />
                {/* v1.0.0 / 平台 v2.6.0: 第四款游戏「分了个类」上线 */}
                <Route path="/flgl" element={<FlglPage />} />
                {/* v1.0.0 / 平台 v2.7.0: 第五款游戏「配了个平」上线 */}
                <Route path="/plgp" element={<PlgpPage />} />
                <Route path="/llgs" element={<LlgsPage />} />
                <Route path="/admin" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Toaster position="top-center" richColors />
        </TooltipProvider>
    );
}
