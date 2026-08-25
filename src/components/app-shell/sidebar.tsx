"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Settings } from "lucide-react";

import { NAV_ITEMS } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/profile-context";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { auth } = useAuth();
  const { profile } = useProfile();

  const displayName = auth.status === "confirmed" ? auth.name ?? "Ученик" : "Гость";
  const metaLine = profile
    ? [profile.exam_type, profile.grade ? `${profile.grade} класс` : null].filter(Boolean).join(" · ")
    : "";

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col border-r border-border bg-card p-6 shadow-sm md:flex dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-black tracking-tight text-primary">Schooler</h1>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Режим экзамена
        </p>
      </div>

      <nav className="flex-1 space-y-1.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition-all",
                active
                  ? "bg-primary text-white dark:stitch-glow"
                  : "text-muted-foreground hover:bg-surface"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pb-1">
        <div className="mb-4 flex items-center gap-3">
          <div className="hex-avatar flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 dark:border dark:border-primary/30">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold">ИИ-репетитор</p>
            <button className="text-xs font-bold text-primary hover:underline">Скоро</button>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
            {displayName[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{displayName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{metaLine || "—"}</p>
          </div>
          <Link
            href="/profile"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
