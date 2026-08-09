/*
 * 化了个学 · 管理后台登录态(上下文)
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { apiLogin, apiLogout, apiMe, type AdminMe } from "./api";

interface AuthCtx {
    me: AdminMe | null;
    login: (token: string) => Promise<{ ok: boolean; msg: string }>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
    me: null,
    login: async () => ({ ok: false, msg: "" }),
    logout: async () => {},
    refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [me, setMe] = useState<AdminMe | null>(null);

    const refresh = useCallback(async () => {
        setMe(await apiMe());
    }, []);

    const login = useCallback(async (token: string) => {
        const r = await apiLogin(token);
        if (r.ok) setMe(await apiMe());
        return { ok: r.ok, msg: r.msg };
    }, []);

    const logout = useCallback(async () => {
        await apiLogout();
        setMe(null);
    }, []);

    return <Ctx.Provider value={{ me, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
    return useContext(Ctx);
}
