export function pointsWord(n: number): string {
  if (n === 1) return "балл";
  if (n < 5) return "балла";
  return "баллов";
}