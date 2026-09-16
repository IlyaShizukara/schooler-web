"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

import { useAuth } from "@/lib/auth-context";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiChatContextValue {
  isOpen: boolean;
  taskId: number | null;
  messages: AiChatMessage[];
  sending: boolean;
  historyLoading: boolean;
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
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Счётчик, чтобы игнорировать ответ устаревшего запроса истории, если
  // пользователь успел закрыть чат и открыть другой (по другому заданию)
  // до того, как первый fetch вернулся — иначе более медленный старый
  // ответ может перезаписать уже актуальные messages нового чата.
  const historyRequestIdRef = useRef(0);

  const openChat = useCallback(
    (newTaskId?: number) => {
      const resolvedTaskId = newTaskId ?? null;
      const requestId = ++historyRequestIdRef.current;

      setTaskId(resolvedTaskId);
      setMessages([]);
      setError(null);
      setIsOpen(true);

      if (auth.status !== "confirmed") return;

      // Раньше чат ВСЕГДА начинался с чистого листа при каждом открытии —
      // теперь подгружаем сохранённую переписку по этому же контексту
      // (общий чат или конкретное задание), если она есть, чтобы диалог не
      // терялся при закрытии чата/перезагрузке страницы.
      setHistoryLoading(true);
      const qs = resolvedTaskId !== null ? `?task_id=${resolvedTaskId}` : "";
      fetch(`${API_BASE_URL}/api/ai/chat/history${qs}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((history: AiChatMessage[]) => {
          if (requestId !== historyRequestIdRef.current) return; // устарел
          if (Array.isArray(history) && history.length > 0) {
            setMessages(history);
          }
        })
        .catch((err) => {
          console.error("[ai-chat] не удалось загрузить историю:", err);
        })
        .finally(() => {
          if (requestId === historyRequestIdRef.current) setHistoryLoading(false);
        });
    },
    [auth]
  );

  const closeChat = useCallback(() => {
    setIsOpen(false);
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (auth.status !== "confirmed" || !trimmed || sending) return;

      const userMessage: AiChatMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
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
          // Раньше сюда уходила вся история сообщений с фронта на каждый
          // запрос — бэкенд теперь сам хранит и подгружает историю по
          // (пользователь, task_id) из БД (см. ai_tutor.py), поэтому здесь
          // достаточно отправить только новое сообщение. Меньше трафика и
          // не нужно самому следить за MAX_HISTORY_MESSAGES на фронте.
          body: JSON.stringify({ message: trimmed, task_id: taskId }),
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
    [auth, taskId, sending]
  );

  return (
    <AiChatContext.Provider
      value={{ isOpen, taskId, messages, sending, historyLoading, error, openChat, closeChat, sendMessage }}
    >
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat() {
  const ctx = useContext(AiChatContext);
  if (!ctx) throw new Error("useAiChat должен использоваться внутри <AiChatProvider>");
  return ctx;
}