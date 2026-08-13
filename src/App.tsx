import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HubPage } from "./game/HubPage";
import { HuaPage } from "./game/HuaPage";
import { RankPage } from "./game/RankPage";
import { WsPage } from "./game2/WsPage";
import { NotFoundPage } from "./game/NotFoundPage";

export default function App() {
    return (
        <TooltipProvider delayDuration={200}>
            <Routes>
                <Route path="/" element={<HubPage />} />
                <Route path="/hlgx/hua" element={<HuaPage />} />
                <Route path="/hlgx/rank" element={<RankPage />} />
                <Route path="/ws" element={<WsPage />} />
                <Route path="/admin" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Toaster position="top-center" richColors />
        </TooltipProvider>
    );
}
