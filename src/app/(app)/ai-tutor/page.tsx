"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";

import { GuestPrompt } from "@/components/guest-prompt";
import { AiChatMessageBubble } from "@/components/ai-chat-message-bubble";
import { useAuth } from "@/lib/auth-context";
import { useAiChat } from "@/lib/ai-chat-context";
import { cn } from "@/lib/utils";

// useSearchParams() обязан быть внутри <Suspense> — иначе `next build`
// падает на пререндере этой страницы с "Error occurred prerendering page
// /ai-tutor" (известная особенность App Router: страница с
// useSearchParams() без Suspense не может быть статически
// оптимизирована). Сама страница поэтому — тонкая обёртка, вся логика
// внутри AiTutorPageInner.
export default function AiTutorPage() {
  return (
    <Suspense fallback={<div className="pt-4 text-sm text-muted-foreground">Загрузка...</div>}>
      <AiTutorPageInner />
    </Suspense>
  );
}

function AiTutorPageInner() {
  const { auth } = useAuth();
  const confirmed = auth.status === "confirmed";
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?task=123 — сюда теперь ведёт кнопка "Объяснить с ИИ-репетитором" со
  // страницы решения задания (раньше открывала модалку) — компактная
  // модалка физически не вмещает диаграмму/структурированный разбор так,
  // как это нужно. Общий чат из AiFab по-прежнему модалка (см.
  // ai-chat-panel.tsx) — там это контекстная быстрая помощь без ухода со
  // страницы, полноэкранный переход был бы лишним.
  const taskParam = searchParams.get("task");
  const taskId = taskParam !== null && !Number.isNaN(Number(taskParam)) ? Number(taskParam) : null;

  const { messages, sending, historyLoading, error, socratic, setSocratic, openChat, closeChat, sendMessage } =
    useAiChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // openChat(taskId) — тот же контракт, что был у модалки: с taskId это
    // сеанс, привязанный к конкретному заданию (переиспользуется при
    // повторном заходе на то же задание), без — сквозной общий сеанс на
    // пользователя (см. _get_or_create_chat_session в ai_tutor.py). При
    // уходе со страницы закрываем чат (closeChat сбрасывает isOpen и
    // обрывает незавершённый запрос) — иначе isOpen остался бы true, и
    // модалка неожиданно вылезла бы поверх следующей страницы.
    if (confirmed) openChat(taskId ?? undefined);
    return () => closeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, taskId]);

  if (!confirmed) {
    return (
      <div className="pt-4">
        <GuestPrompt message="Войдите через Telegram, чтобы пообщаться с ИИ-репетитором." />
      </div>
    );
  }

  function handleSend() {
    if (!input.trim() || sending) return;
    void sendMessage(input);
    setInput("");
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col md:h-[calc(100vh-140px)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {taskId != null && (
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              aria-label="Назад к заданию"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">ИИ-репетитор</h1>
            <p className="text-sm text-muted-foreground">
              {taskId != null ? "Разбор текущего задания" : "Спроси о любой теме из подготовки к экзамену"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setSocratic(!socratic)}
          title={
            socratic
              ? "Сократический режим включён: сначала подсказки, потом полное решение"
              : "Сократический режим выключен: сразу полное решение"
          }
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            socratic
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-surface"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", socratic ? "bg-primary" : "bg-muted-foreground")} />
          Режим: Сократический
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-6">
          {historyLoading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Загружаем переписку...</p>
          )}
          {!historyLoading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {taskId != null
                ? "Спроси, что непонятно в этом задании — объясню по шагам на основе его условия и правильного ответа."
                : "Привет! Спроси о любой теме из подготовки к экзамену — объясню по шагам."}
            </p>
          )}
          {messages.map((m, i) => (
            <AiChatMessageBubble
              key={i}
              message={m}
              isStreaming={sending && m.role === "assistant" && i === messages.length - 1}
              taskId={taskId}
              precedingUserText={messages[i - 1]?.role === "user" ? messages[i - 1].content : undefined}
            />
          ))}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex items-center gap-2 border-t border-border p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Спроси что-нибудь..."
            className="flex-1 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            disabled={sending || !input.trim()}
            onClick={handleSend}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            aria-label="Отправить"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}