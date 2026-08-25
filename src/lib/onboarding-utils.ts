export function defaultExamDate(examType: "ЕГЭ" | "ОГЭ", grade: number): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const juneFirstThisYear = new Date(today.getFullYear(), 5, 1);
  const nextJune = today <= juneFirstThisYear ? juneFirstThisYear : new Date(today.getFullYear() + 1, 5, 1);
  const finalGrade = examType === "ЕГЭ" ? 11 : 9;
  const gapYears = Math.max(0, finalGrade - grade);
  return new Date(nextJune.getFullYear() + gapYears, 5, 1);
}

export function formatRuDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export function parseRuDateToIso(value: string): string | null {
  const trimmed = (value || "").trim();
  const parts = trimmed.split(".");
  if (parts.length !== 3) return null;
  const [dayStr, monthStr, yearStr] = parts;
  if (![dayStr, monthStr, yearStr].every((p) => /^\d+$/.test(p))) return null;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}