"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";

import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

export function EmailAuthForm() {
  const { loginWithSupabaseAccessToken } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function submit() {
    setError(null);
    setInfo(null);

    if (!email.trim() || !password) {
      setError("Заполните email и пароль");
      return;
    }
    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (!data.session) {
          // В настройках Supabase включено подтверждение email — сессии
          // сразу не будет, пока пользователь не перейдёт по ссылке из письма.
          setInfo("Мы отправили письмо для подтверждения на этот адрес — перейдите по ссылке в нём, потом войдите здесь.");
          return;
        }
        await loginWithSupabaseAccessToken(data.session.access_token);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        if (data.session) {
          const ok = await loginWithSupabaseAccessToken(data.session.access_token);
          if (!ok) setError("Не удалось завершить вход — попробуйте ещё раз");
        }
      }
    } catch (err) {
      console.error("[email-auth] ошибка:", err);
      setError("Не удалось выполнить запрос — проверьте соединение и попробуйте ещё раз");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
        <button
          onClick={() => switchMode("signin")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
            mode === "signin" ? "bg-surface shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Вход
        </button>
        <button
          onClick={() => switchMode("signup")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
            mode === "signup" ? "bg-surface shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Регистрация
        </button>
      </div>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void submit()}
        placeholder="Пароль"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
      {info && <p className="text-xs text-muted-foreground">{info}</p>}

      <button
        disabled={submitting}
        onClick={() => void submit()}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_4px_20px_rgba(108,37,255,0.25)] transition-all hover:shadow-[0_10px_30px_rgba(108,37,255,0.35)] dark:shadow-[0_0_15px_rgba(108,37,255,0.4)] disabled:opacity-60 disabled:shadow-none"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {mode === "signup" ? "Зарегистрироваться" : "Войти"}
      </button>
    </div>
  );
}
