"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[72px] items-center justify-around border-t border-border bg-card/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden dark:shadow-[0_-10px_30px_rgba(108,37,255,0.15)]">
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 transition-transform active:scale-90",
              active ? "text-primary" : "text-muted-foreground/70"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-semibold">{label}</span>
            {active && (
              <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary dark:shadow-[0_0_8px_#6C25FF]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
