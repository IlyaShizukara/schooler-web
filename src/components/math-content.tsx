"use client";

import { cn } from "@/lib/utils";
import { toMathJaxHtml } from "@/lib/math-content";
import { useMathJaxTypeset } from "@/lib/use-mathjax-typeset";

// Часть формул в заданиях приходит не через MathJax ($...$ -> \(...\)), а
// готовыми SVG-картинками из редактора Wiris (<img class="ml_wiris-formula">).
// MathJax их не трогает — их размер задаёт сам SVG-файл, обычно очень
// маленький. Масштабируем через em, чтобы они росли вместе с font-size
// обёртки (той, что передаётся снаружи через className) — длинная формула
// не сжимается сильнее короткой, все получают одинаковый прирост.
const WIRIS_FORMULA_SCALE =
  "[&_.ml_wiris-formula]:inline-block [&_.ml_wiris-formula]:max-h-[3em] [&_.ml_wiris-formula]:w-auto [&_.ml_wiris-formula]:max-w-full [&_.ml_wiris-formula]:align-middle";

export function MathContent({ text, className }: { text: string | null | undefined; className?: string }) {
  const html = toMathJaxHtml(text ?? "");
  const ref = useMathJaxTypeset([html]);

  return (
    <div
      ref={ref}
      className={cn(WIRIS_FORMULA_SCALE, className)}
      style={{ color: "var(--foreground)" }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
