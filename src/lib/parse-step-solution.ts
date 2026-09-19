// Парсит служебную разметку шагов решения, которую пишет ИИ-репетитор,
// когда даёт ПОЛНОЕ пошаговое решение (см. _STRUCTURED_FORMAT_INSTRUCTIONS
// в ai_tutor.py):
//
//   [[ШАГ:Название шага|ТИП]]
//   Текст шага...
//   [[ШАГ:Следующий шаг|ТИП]]
//   Текст...
//   [[РЕЗУЛЬТАТ]]
//   Итоговый ответ
//
// Намеренно НЕ JSON — модель не гарантированно генерирует валидный JSON, а
// обрыв на середине объекта (лимит токенов, сеть) сделал бы весь ответ
// нерендерящимся целиком. Текстовые маркеры деградируют мягко: если модель
// не проставила ни одного (обычный разговорный ответ, подсказка) —
// parseStepSolution просто возвращает null, и вызывающий код рендерит
// content как обычный текст/MathContent, как и раньше.
//
// Вызывать только на ПОЛНОСТЬЮ полученном сообщении (после завершения
// стрима) — см. ai-chat-panel.tsx: во время стриминга маркер может прийти
// недописанным ("[[ШАГ:Гео" без закрывающей скобки), и его просто не
// найдёт регулярка — ничего не сломается, но и не отрендерится, пока
// сообщение не придёт целиком.

export interface SolutionStep {
  title: string;
  type: string;
  body: string;
}

export interface ParsedSolution {
  intro?: string;
  steps: SolutionStep[];
  result?: string;
}

const MARKER_RE = /\[\[(?:ШАГ:([^|\]]+)\|([^\]]+)|РЕЗУЛЬТАТ)\]\]/g;

export function parseStepSolution(text: string): ParsedSolution | null {
  const matches = [...text.matchAll(MARKER_RE)];
  if (matches.length === 0) return null;

  const firstIndex = matches[0].index ?? 0;
  const intro = text.slice(0, firstIndex).trim();

  const steps: SolutionStep[] = [];
  let result: string | undefined;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const segStart = (m.index ?? 0) + m[0].length;
    const segEnd = i + 1 < matches.length ? matches[i + 1].index ?? text.length : text.length;
    const body = text.slice(segStart, segEnd).trim();

    const isResultMarker = m[1] === undefined; // ветка "РЕЗУЛЬТАТ" не даёт групп 1/2
    if (isResultMarker) {
      result = body;
    } else {
      const title = m[1].trim();
      const type = m[2].trim();
      if (title && body) {
        steps.push({ title, type, body });
      }
    }
  }

  // Если нашли только маркер РЕЗУЛЬТАТ без единого валидного шага — это,
  // скорее всего, случайное совпадение с обычным текстом, а не реальная
  // структурированная разметка. Безопаснее откатиться на обычный рендер.
  if (steps.length === 0) return null;

  return { intro: intro || undefined, steps, result };
}