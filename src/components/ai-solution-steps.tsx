import { MathContent } from "@/components/math-content";
import type { ParsedSolution } from "@/lib/parse-step-solution";
import { cn } from "@/lib/utils";

// Цвет бейджа по типу шага. Модель не обязана использовать ровно эти три
// слова (см. промпт — "выбирай подходящее по смыслу"), поэтому любой не
// распознанный тип просто попадает в дефолтную серую ветку, а не ломает
// рендер.
const TYPE_STYLES: Record<string, string> = {
  ОБОСНОВАНО: "bg-primary/15 text-primary",
  ТЕОРЕМА: "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  РАСЧЁТ: "bg-success/15 text-success",
  ВЫВОД: "bg-warning/15 text-warning",
};
const DEFAULT_TYPE_STYLE = "bg-surface-2 text-muted-foreground";

export function AiSolutionSteps({ solution }: { solution: ParsedSolution }) {
  return (
    <div className="flex flex-col gap-3">
      {solution.intro && <MathContent text={solution.intro} />}

      {solution.steps.map((step, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-sm font-bold">{step.title}</span>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                TYPE_STYLES[step.type] ?? DEFAULT_TYPE_STYLE
              )}
            >
              {step.type}
            </span>
          </div>
          <MathContent text={step.body} />
        </div>
      ))}

      {solution.result && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-success">Результат</p>
          <MathContent text={solution.result} />
        </div>
      )}
    </div>
  );
}