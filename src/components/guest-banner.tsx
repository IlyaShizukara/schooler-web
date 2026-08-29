"use client";

import { useAuth } from "@/lib/auth-context";

/**
 * Ненавязчивый баннер для страниц, которые теперь открыты и гостю (банк
 * заданий, темы, пробники) — в отличие от GuestPrompt, не блокирует
 * контент, а просто честно объясняет, что прогресс не сохраняется, и
 * предлагает войти. message можно переопределить под контекст конкретной
 * страницы.
 */
export function GuestBanner({
  message = "Можно решать задания без входа, но прогресс не сохраняется.",
}: {
  message?: string;
}) {
  const { startLogin } = useAuth();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
      <span>{message}</span>
      <button onClick={() => void startLogin()} className="font-semibold text-primary hover:underline">
        Войти через Telegram
      </button>
    </div>
  );
}
