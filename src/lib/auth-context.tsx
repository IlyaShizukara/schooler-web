"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { apiGet, apiGetAuth, apiPost, apiPostAuth, type AuthStartResponse, type SessionStatusResponse } from "@/lib/api";

const STORAGE_KEY = "schooler.session_token";

type AuthState =
  | { status: "guest" }
  | { status: "pending"; code: string; deepLink: string }
  | { status: "confirmed"; token: string; name: string | null };

interface AuthContextValue {
  auth: AuthState;
  startLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: "guest" });
  const pollAbortRef = useRef(false);

  const confirmWithToken = useCallback(async (token: string) => {
    try {
      const data = await apiGetAuth<SessionStatusResponse>("/api/auth/me", token);
      if (data.status === "confirmed") {
        setAuth({ status: "confirmed", token, name: data.name ?? null });
        localStorage.setItem(STORAGE_KEY, token);
        return true;
      }
    } catch {
      // токен недействителен — тихо остаёмся гостем
    }
    return false;
  }, []);

  // ---- 1. Восстановление сохранённой сессии ----
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) void confirmWithToken(saved);
  }, [confirmWithToken]);

  // ---- 2. Telegram Mini App auto-login (нативно, без шима) ----
  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string; ready?: () => void } } }).Telegram
      ?.WebApp;
    if (!tg?.initData) return;
    tg.ready?.();

    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"}/api/auth/webapp`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ init_data: tg.initData }),
          }
        );
        if (!res.ok) return;
        const data = (await res.json()) as SessionStatusResponse;
        if (data.session_token) await confirmWithToken(data.session_token);
      } catch {
        // молча остаёмся гостем — обычный вход всё ещё доступен
      }
    })();
  }, [confirmWithToken]);

  const pollSession = useCallback(
    async (code: string) => {
      pollAbortRef.current = false;
      for (let i = 0; i < 90; i++) {
        if (pollAbortRef.current) return;
        await new Promise((r) => setTimeout(r, 2000));
        try {
          // публичный эндпоинт — токен не нужен, поэтому apiGet, а не apiGetAuth
          const data = await apiGet<SessionStatusResponse>(`/api/auth/session/${code}`);
          if (data.status === "confirmed" && data.session_token) {
            await confirmWithToken(data.session_token);
            return;
          }
          if (data.status === "expired") {
            setAuth({ status: "guest" });
            return;
          }
        } catch {
          // сетевой сбой на одной итерации — пробуем снова на следующей
        }
      }
      setAuth({ status: "guest" }); // истёк лимит ожидания (~3 минуты)
    },
    [confirmWithToken]
  );

  const startLogin = useCallback(async () => {
    try {
        const data = await apiPost<AuthStartResponse>("/api/auth/start");
        setAuth({ status: "pending", code: data.code, deepLink: data.deep_link });
        window.open(data.deep_link, "_blank");
        void pollSession(data.code);
    } catch (err) {
        console.error("Не удалось начать вход:", err);
        setAuth({ status: "guest" });
    }
  }, [pollSession]);

  const logout = useCallback(async () => {
    pollAbortRef.current = true;
    if (auth.status === "confirmed") {
      try {
        await apiPostAuth("/api/auth/logout", auth.token); // реальный POST без тела
      } catch {
        // best-effort
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    setAuth({ status: "guest" });
  }, [auth]);

  return <AuthContext.Provider value={{ auth, startLogin, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри <AuthProvider>");
  return ctx;
}