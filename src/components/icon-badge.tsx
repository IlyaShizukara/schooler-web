import type { LucideIcon } from "lucide-react";

export function IconBadge({ icon: Icon, color }: { icon: LucideIcon; color?: string | null }) {
  const accent = color ?? "var(--primary)";
  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-xl"
      style={{ backgroundColor: `color-mix(in srgb, ${accent} 16%, transparent)` }}
    >
      <Icon className="h-5 w-5" style={{ color: accent }} />
    </div>
  );
}