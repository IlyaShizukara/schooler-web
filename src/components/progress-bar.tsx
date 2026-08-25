export function ProgressBar({ percent, color }: { percent: number; color?: string | null }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-1.5 w-full rounded-full bg-surface-2">
      <div
        className="h-1.5 rounded-full transition-all"
        style={{ width: `${clamped}%`, backgroundColor: color ?? "var(--primary)" }}
      />
    </div>
  );
}