import { Outlet } from "react-router";

export function RequireAuth() {
  // Phase 5 实现: 请求 /admin/api/auth/me, 未登录重定向 /admin/login
  return <Outlet />;
}
