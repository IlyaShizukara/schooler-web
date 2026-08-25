export function daysUntil(dateIso: string): number {
  const target = new Date(`${dateIso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Точный отсчёт до конца дня экзамена: {days, hours} — для баннера в духе
 * Stitch-дизайна ("45 Дней : 12 Часов"), в отличие от daysUntil() считает не
 * от полуночи-к-полуночи, а от текущего момента. */
export function daysAndHoursUntil(dateIso: string): { days: number; hours: number } {
  const target = new Date(`${dateIso}T23:59:59`);
  const now = new Date();
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalHours = Math.floor(diffMs / 3_600_000);
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 };
}
