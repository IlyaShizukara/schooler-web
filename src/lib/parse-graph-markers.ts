// Парсит служебный маркер графиков, который ИИ-репетитор вставляет прямо в
// текст ответа (см. новый блок инструкции в _BASE_SYSTEM_PROMPT/ai_tutor.py):
//
//   Текст объяснения...
//   [[ГРАФИК:y=x^2;y=2x+1]]
//   Текст после графика...
//
// Та же философия, что и в parse-step-solution.ts — текстовая разметка, а
// не JSON: обрыв на середине маркера (лимит токенов, сеть) не ломает весь
// ответ, просто маркер не находится регуляркой, пока не допишется целиком.
// Выражения — LaTeX-подобный синтаксис, который Desmos понимает напрямую и
// прощает небольшие неточности (никакого json.loads с этой стороны).
//
// Вызывать только на ПОЛНОСТЬЮ полученном сообщении (после завершения
// стрима) — та же логика, что и у parseStepSolution: недописанный маркер
// "[[ГРАФИК:y=x^2" без закрывающей скобки просто не совпадёт с регуляркой
// и ничего не сломает, но и не отрендерится раньше времени.
//
// В отличие от шагов решения, график может встретиться в любом месте
// текста (intro, тело шага, результат, обычный чат-ответ) и их может быть
// несколько — поэтому парсер возвращает не объект с фиксированными полями,
// а последовательность кусков: текст / график / текст / график / ...
// Рендерится MathContentWithGraphs (components/math-content-with-graphs.tsx).

export interface GraphPart {
  type: "graph";
  expressions: string[];
}

export interface TextPart {
  type: "text";
  content: string;
}

export type ContentPart = TextPart | GraphPart;

const GRAPH_MARKER_RE = /\[\[ГРАФИК:([^\]]+)\]\]/g;

export function parseGraphMarkers(text: string): ContentPart[] | null {
  const matches = [...text.matchAll(GRAPH_MARKER_RE)];
  if (matches.length === 0) return null;

  const parts: ContentPart[] = [];
  let cursor = 0;

  for (const m of matches) {
    const start = m.index ?? 0;

    const before = text.slice(cursor, start);
    if (before.trim()) {
      parts.push({ type: "text", content: before });
    }

    const expressions = m[1]
      .split(";")
      .map((expr) => expr.trim())
      .filter(Boolean);

    // Маркер без единого валидного выражения (пустой ";;" и т.п.) —
    // пропускаем сам маркер молча, не рендерим пустой график.
    if (expressions.length > 0) {
      parts.push({ type: "graph", expressions });
    }

    cursor = start + m[0].length;
  }

  const after = text.slice(cursor);
  if (after.trim()) {
    parts.push({ type: "text", content: after });
  }

  // Если после всех маркеров не осталось ни одного текстового куска и ни
  // одного валидного графика (крайний случай — маркер был, но пустой) —
  // откатываемся на "маркеров нет", чтобы вызывающий код не рендерил
  // пустоту вместо обычного текста.
  if (parts.length === 0) return null;

  return parts;
}