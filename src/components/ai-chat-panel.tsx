"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Send, X } from "lucide-react";

import { useAiChat } from "@/lib/ai-chat-context";
import { AiChatMessageBubble } from "@/components/ai-chat-message-bubble";
import { cn } from "@/lib/utils";

export function AiChatPanel() {
  const { isOpen, taskId, messages, sending, error, socratic, setSocratic, closeChat, sendMessage } = useAiChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // На полноэкранной странице /ai-tutor общий чат уже отрисован во весь
  // экран этой же страницей (см. app/ai-tutor/page.tsx) — если модалка
  // всё равно откроется поверх (например, isOpen остался true с прошлой
  // страницы), получится чат поверх чата. Модалка остаётся рабочей на
  // любой другой странице — там это по-прежнему контекстная помощь без
  // ухода со страницы (AiFab, "Объяснить с ИИ-репетитором" при решении).
  if (pathname === "/ai-tutor") return null;
  if (!isOpen) return null;

  function handleSend() {
    if (!input.trim() || sending) return;
    void sendMessage(input);
    setInput("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
      onClick={closeChat}
    >
      <div
        className="glass-panel flex h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-card md:h-[600px] md:max-w-md md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <div className="hex-avatar flex h-8 w-8 items-center justify-center bg-primary/15">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">ИИ-репетитор</p>
              {taskId != null && <p className="text-xs text-muted-foreground">По текущему заданию</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSocratic(!socratic)}
              title={
                socratic
                  ? "Сократический режим включён: сначала подсказки, потом полное решение"
                  : "Сократический режим выключен: сразу полное решение"
              }
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                socratic
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-surface"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", socratic ? "bg-primary" : "bg-muted-foreground")} />
              Сократ.
            </button>
            <button
              onClick={closeChat}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-surface"
              aria-label="Закрыть чат"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {taskId != null
                ? "Спроси, что непонятно в этом задании — объясню по шагам на основе его условия и правильного ответа."
                : "Привет! Спроси о любой теме из подготовки к экзамену."}
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