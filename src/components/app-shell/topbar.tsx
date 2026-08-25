"use client";

import { Bell, Search } from "lucide-react";

import { AuthSection } from "@/components/app-shell/auth-section";
import { ThemeToggle } from "@/components/theme-toggle";

export function Topbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 hidden h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-md md:left-64 md:flex">
      <div />
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск заданий, тем, предметов..."
            className="w-64 rounded-full border border-border bg-surface py-2 pl-10 pr-4 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <ThemeToggle />

        <button className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </button>

        <AuthSection />
      </div>
    </header>
  );
}
