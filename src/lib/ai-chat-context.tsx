"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

import { useAuth } from "@/lib/auth-context";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

// Держим в синхроне с MAX_HISTORY_MESSAGES в ai_tutor.py — смысла слать
// больше сообщений, чем бэкенд всё равно обрежет, нет.
const MAX_HISTORY_MESSAGES = 20;

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiChatContextValue {
  isOpen: boolean;
  taskId: number | null;
  messages: AiChatMessage[];
  sending: boolean;
  error: string | null;
  openChat: (taskId?: number) => void;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
}

const AiChatContext = createContext<AiChatContextValue | null>(null);

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const openChat = useCallback((newTaskId?: number) => {
    // Новое открытие — новый диалог. Если человек открыл чат из другого
    // задания, старая история про предыдущее только запутает контекст
    // (а бэкенд всё равно предполагает один task_id на весь запрос).
    setTaskId(newTaskId ?? null);
    setMessages([]);
    setError(null);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (auth.status !== "confirmed" || !text.trim() || sending) return;

      const userMessage: AiChatMessage = { role: "user", content: text.trim() };
      const historyToSend = [...messages, userMessage].slice(-MAX_HISTORY_MESSAGES);
      setMessages([...historyToSend, { role: "assistant", content: "" }]);
      setSending(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ messages: historyToSend, task_id: taskId }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Сервер ответил ${res.status}`);
        }

        // Бэкенд стримит обычный text/plain (см. ai_tutor.py) — не SSE,
        // поэтому просто читаем чанки и накапливаем текст без разбора
        // event-фреймов.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const snapshot = accumulated;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: snapshot };
            return updated;
          });
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[ai-chat] ошибка запроса:", err);
          setError("Не удалось получить ответ — проверьте соединение и попробуйте ещё раз");
        }
      } finally {
        setSending(false);
      }
    },
    [auth, messages, taskId, sending]
  );

  return (
    <AiChatContext.Provider value={{ isOpen, taskId, messages, sending, error, openChat, closeChat, sendMessage }}>
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat() {
  const ctx = useContext(AiChatContext);
  if (!ctx) throw new Error("useAiChat должен использоваться внутри <AiChatProvider>");
  return ctx;
}