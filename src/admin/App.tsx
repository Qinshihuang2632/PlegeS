import { Navigate, Route, Routes } from "react-router";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RanksPage } from "./pages/RanksPage";
import { LogsPage } from "./pages/LogsPage";
import { SessionsPage } from "./pages/SessionsPage";
import { AdminLayout } from "./AdminLayout";
import { RequireAuth } from "./RequireAuth";

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* 受保护区域: 未登录自动重定向 /login */}
      <Route element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ranks" element={<RanksPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
