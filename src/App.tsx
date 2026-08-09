import { Navigate, Route, Routes } from "react-router";
import { HubPage } from "./game/HubPage";
import { HuaPage } from "./game/HuaPage";
import { RankPage } from "./game/RankPage";
import { NotFoundPage } from "./game/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HubPage />} />
      <Route path="/hlgx/hua" element={<HuaPage />} />
      <Route path="/hlgx/rank" element={<RankPage />} />
      <Route path="*" element={<NotFoundPage />} />
      <Route path="/admin" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
