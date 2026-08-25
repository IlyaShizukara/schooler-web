import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  iconColor,
  value,
  label,
  sub,
  subColor,
}: {
  icon: LucideIcon;
  iconColor: string;
  value: string;
  label: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <Icon className="h-5 w-5" style={{ color: iconColor }} />
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {sub && (
        <div className="mt-1 text-xs" style={{ color: subColor ?? "var(--muted-foreground)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}