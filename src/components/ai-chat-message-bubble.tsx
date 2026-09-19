"use client";

import { useState } from "react";
import { Box } from "lucide-react";

import { MathContent } from "@/components/math-content";
import { parseStepSolution } from "@/lib/parse-step-solution";
import { AiSolutionSteps } from "@/components/ai-solution-steps";
import { AiSolidViewer } from "@/components/ai-solid-viewer";
import type { GeometryExtraction } from "@/lib/geometry-solid";
import { apiPostAuth } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AiChatMessage } from "@/lib/ai-chat-context";
import { cn } from "@/lib/utils";

export function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.3s]" />
    </span>
  );
}

type GeometryState = "idle" | "loading" | "loaded" | "unavailable" | "error";

/** Пузырёк одного сообщения — используется и в модалке (ai-chat-panel.tsx),
 * и на полноэкранной странице (app/ai-tutor/page.tsx).
 *
 * taskId/precedingUserText — источник для кнопки "3D-модель" (см.
 * ai_geometry.py): если есть taskId, бэкенд возьмёт условие из самого
 * задания (надёжнее, кэшируется); если это общий чат без привязки к
 * заданию — используется текст предыдущего сообщения ученика (там, где он
 * сформулировал задачу словами). */
export function AiChatMessageBubble({
  message,
  isStreaming,
  taskId = null,
  precedingUserText,
}: {
  message: AiChatMessage;
  isStreaming: boolean;
  taskId?: number | null;
  precedingUserText?: string;
}) {
  const { auth } = useAuth();
  const [geometryState, setGeometryState] = useState<GeometryState>("idle");
  const [geometry, setGeometry] = useState<GeometryExtraction | null>(null);

  // Парсим/типсеттим только ПОЛНОСТЬЮ полученное сообщение — см.
  // parse-step-solution.ts и комментарий в ai-chat-panel.tsx про то, почему
  // недописанный маркер/формулу на середине стрима лучше не трогать.
  const parsedSolution = message.role === "assistant" && !isStreaming ? parseStepSolution(message.content) : null;

  // Кнопка 3D-модели показывается только у ЗАВЕРШЁННОГО структурированного
  // решения (parsedSolution !== null) — это лучший доступный сигнал, что
  // сообщение действительно разбирает конкретную задачу, а не отвечает на
  // общий вопрос. Не показываем, если уже выяснили, что построить не
  // получилось (unavailable) — не предлагать то, что заведомо не сработает.
  const canOfferGeometry =
    parsedSolution !== null && (taskId != null || !!precedingUserText) && geometryState !== "unavailable";

  async function handleBuildGeometry() {
    if (auth.status !== "confirmed" || geometryState === "loading") return;
    setGeometryState("loading");
    try {
      const result = await apiPostAuth<GeometryExtraction | null>("/api/ai/geometry", auth.token, {
        task_id: taskId,
        problem_text: taskId == null ? precedingUserText : undefined,
      });
      if (result) {
        setGeometry(result);
        setGeometryState("loaded");
      } else {
        // Модель не уверена / это не правильная пирамида-призма с
        // поддерживаемым основанием — честно говорим об этом один раз,
        // а не молчим, будто кнопка не сработала.
        setGeometryState("unavailable");
      }
    } catch {
      setGeometryState("error");
    }
  }

  return (
    <div
      className={cn(
        "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
        parsedSolution ? "max-w-[95%]" : "max-w-[85%]",
        message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-surface"
      )}
    >
      {!message.content ? (
        <TypingDots />
      ) : parsedSolution ? (
        <AiSolutionSteps solution={parsedSolution} />
      ) : message.role === "assistant" && !isStreaming ? (
        <MathContent text={message.content} />
      ) : (
        message.content
      )}

      {canOfferGeometry && geometryState !== "loaded" && (
        <button
          onClick={() => void handleBuildGeometry()}
          disabled={geometryState === "loading"}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-background disabled:opacity-60"
        >
          <Box className="h-3.5 w-3.5" />
          {geometryState === "loading" ? "Строим модель..." : "Построить 3D-модель"}
        </button>
      )}
      {geometryState === "unavailable" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Не получилось построить модель для этой задачи — поддерживаются только правильные пирамиды и призмы.
        </p>
      )}
      {geometryState === "error" && (
        <p className="mt-2 text-xs text-destructive">Не удалось построить модель, попробуйте ещё раз.</p>
      )}
      {geometryState === "loaded" && geometry && (
        <div className="mt-3">
          <AiSolidViewer geometry={geometry} />
        </div>
      )}
    </div>
  );
}