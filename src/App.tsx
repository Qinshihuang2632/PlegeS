import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HubPage } from "./game/HubPage";
import { HuaPage } from "./game/HuaPage";
import { RankPage } from "./game/RankPage";
import { YlgyPage } from "./game2/YlgyPage";
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
                <Route path="/clgz" element={<ClgzPage />} />
                <Route path="/admin" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Toaster position="top-center" richColors />
        </TooltipProvider>
    );
}
