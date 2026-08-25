"use client";

import { Bell, Hexagon } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

export function MobileTopbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-2">
        <Hexagon className="h-5 w-5 fill-primary/20 text-primary" />
        <span className="text-lg font-black tracking-tight text-primary">Schooler</span>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
