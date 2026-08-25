export const TIME_OPTIONS = ["1 час", "2 часа", "3 часа (ЕГЭ)", "3ч 55мин"] as const;

export const EXAM_TASK_COUNTS: Record<string, { part1: number; part2: number; total: number }> = {
  math_profile: { part1: 12, part2: 7, total: 19 },
  math_basic: { part1: 21, part2: 0, total: 21 },
  russian: { part1: 26, part2: 1, total: 27 },
  physics: { part1: 20, part2: 6, total: 26 },
  chemistry: { part1: 28, part2: 6, total: 34 },
  biology: { part1: 21, part2: 7, total: 28 },
  history: { part1: 12, part2: 9, total: 21 },
  social: { part1: 16, part2: 9, total: 25 },
  informatics: { part1: 27, part2: 0, total: 27 },
  english: { part1: 36, part2: 6, total: 42 },
  geography: { part1: 21, part2: 8, total: 29 },
  literature: { part1: 6, part2: 5, total: 11 },
};

export function parseProbnikTime(label: string): number {
  const hMatch = label.match(/(\d+)\s*ч/);
  const mMatch = label.match(/(\d+)\s*мин/);
  const hours = hMatch ? Number(hMatch[1]) : 0;
  const minutes = mMatch ? Number(mMatch[1]) : 0;
  return hours * 3600 + minutes * 60;
}

export function formatDurationShort(label: string): string {
  const totalSeconds = parseProbnikTime(label);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h && m) return `${h}ч ${m}м`;
  if (h) return `${h}ч`;
  return `${m}м`;
}

export function formatRemaining(deadline: number | null): string {
  if (!deadline) return "--:--";
  const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Реальное затраченное время на прохождение — "3ч 15м" / "42м". */
export function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h && m) return `${h}ч ${m}м`;
  if (h) return `${h}ч`;
  return `${m}м`;
}

export function maxScoreLabel(subjectSlug: string | null): string {
  return subjectSlug === "math_basic" ? "21" : "100";
}
