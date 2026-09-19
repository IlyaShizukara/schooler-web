"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { GuestPrompt } from "@/components/guest-prompt";
import { AiChatMessageBubble } from "@/components/ai-chat-message-bubble";
import { useAuth } from "@/lib/auth-context";
import { useAiChat } from "@/lib/ai-chat-context";
import { cn } from "@/lib/utils";

export default function AiTutorPage() {
  const { auth } = useAuth();
  const confirmed = auth.status === "confirmed";
  const { messages, sending, historyLoading, error, socratic, setSocratic, openChat, closeChat, sendMessage } =
    useAiChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // openChat() без task_id — это тот же сквозной "общий" чат, что и при
    // открытии из AiFab/сайдбара без привязки к заданию (см.
    // _get_or_create_chat_session в ai_tutor.py: task_id IS NULL — один
    // сеанс на пользователя). При уходе со страницы закрываем чат
    // (closeChat сбрасывает isOpen и обрывает незавершённый запрос) —
    // иначе isOpen остался бы true, и AiChatPanel вылез бы модалкой поверх
    // следующей страницы, на которую перейдёт пользователь.
    if (confirmed) openChat();
    return () => closeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">ИИ-репетитор</h1>
          <p className="text-sm text-muted-foreground">Спроси о любой теме из подготовки к экзамену</p>
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
              Привет! Спроси о любой теме из подготовки к экзамену — объясню по шагам.
            </p>
          )}
          {messages.map((m, i) => (
            <AiChatMessageBubble
              key={i}
              message={m}
              isStreaming={sending && m.role === "assistant" && i === messages.length - 1}
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