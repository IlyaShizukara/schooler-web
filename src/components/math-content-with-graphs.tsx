import { MathContent } from "@/components/math-content";
import { DesmosGraph } from "@/components/desmos-graph";
import { parseGraphMarkers } from "@/lib/parse-graph-markers";

// Обёртка вместо правки MathContent/AiSolutionSteps напрямую — тот же
// подход, что и с AiSolutionSteps поверх MathContent: если маркеров
// графика нет (обычный текст, подсказка, разбор без графиков), просто
// делегирует в MathContent один в один, ничего не меняя в поведении.
export function MathContentWithGraphs({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const parts = text ? parseGraphMarkers(text) : null;

  if (!parts) {
    return <MathContent text={text} className={className} />;
  }

  return (
    <div className={className}>
      {parts.map((part, i) =>
        part.type === "text" ? (
          <MathContent key={i} text={part.content} />
        ) : (
          <DesmosGraph key={i} expressions={part.expressions} />
        )
      )}
    </div>
  );
}