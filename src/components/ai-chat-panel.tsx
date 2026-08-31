"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";

import { useAiChat } from "@/lib/ai-chat-context";
import { cn } from "@/lib/utils";

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.3s]" />
    </span>
  );
}

export function AiChatPanel() {
  const { isOpen, taskId, messages, sending, error, closeChat, sendMessage } = useAiChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
          <button
            onClick={closeChat}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-surface"
            aria-label="Закрыть чат"
          >
            <X className="h-5 w-5" />
          </button>
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
            <div
              key={i}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-surface"
              )}
            >
              {m.content ? m.content : <TypingDots />}
            </div>
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