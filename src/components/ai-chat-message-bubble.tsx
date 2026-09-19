import { MathContent } from "@/components/math-content";
import { parseStepSolution } from "@/lib/parse-step-solution";
import { AiSolutionSteps } from "@/components/ai-solution-steps";
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

/** Пузырёк одного сообщения — используется и в модалке (ai-chat-panel.tsx),
 * и на полноэкранной странице (app/ai-tutor/page.tsx), чтобы логика
 * "как определить, что стрим ещё идёт, и когда парсить шаги/формулы"
 * жила в одном месте, а не дублировалась в двух местах и не расходилась
 * при будущих правках. */
export function AiChatMessageBubble({
  message,
  isStreaming,
}: {
  message: AiChatMessage;
  isStreaming: boolean;
}) {
  // Парсим/типсеттим только ПОЛНОСТЬЮ полученное сообщение — см.
  // parse-step-solution.ts и комментарий в ai-chat-panel.tsx про то, почему
  // недописанный маркер/формулу на середине стрима лучше не трогать.
  const parsedSolution = message.role === "assistant" && !isStreaming ? parseStepSolution(message.content) : null;

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
    </div>
  );
}