"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Loader2, Menu, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_ITEMS } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth-context";
import { useAuthedData } from "@/lib/use-authed-data";
import type { XpSummaryResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
        <span className="text-sm font-bold text-primary">S</span>
      </div>
      <span className="text-lg font-bold">
        School<span className="text-primary">er</span>
      </span>
    </Link>
  );
}

function ExamTypeToggle() {
  // TODO: подключить к реальному состоянию пользователя (профиль) —
  // пока локальный плейсхолдер, чтобы был виден весь layout.
  const [examType, setExamType] = useState<"ОГЭ" | "ЕГЭ">("ЕГЭ");
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-surface-2 p-0.5">
      {(["ОГЭ", "ЕГЭ"] as const).map((t) => (
        <button
          key={t}
          onClick={() => setExamType(t)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            examType === t
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-surface-2 text-foreground"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

function AuthSection() {
  const { auth, startLogin, logout } = useAuth();

  if (auth.status === "guest") {
    return (
      <Button size="sm" onClick={() => void startLogin()}>
        Войти через Telegram
      </Button>
    );
  }

  if (auth.status === "pending") {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void logout()}
        className="gap-2"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Ожидание подтверждения…
      </Button>
    );
  }

  const initial = auth.name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton={false}
        render={
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarFallback className="bg-primary/20 text-primary">{initial}</AvatarFallback>
          </Avatar>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href="/profile">Профиль</Link>} />
        <DropdownMenuItem onClick={() => void logout()}>Выйти</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: xp } = useAuthedData<XpSummaryResponse>("/api/xp/summary");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-6">
          <Logo />
          <div className="hidden md:block">
            <ExamTypeToggle />
          </div>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex items-center gap-1 text-sm font-medium">
              <Star className="h-4 w-4 text-warning" />
              <span>{xp ? xp.current_streak : "—"}</span>
            </div>
            <Badge variant="secondary" className="rounded-lg">
              Ур. {xp ? xp.level : "—"}
            </Badge>
          </div>

          <ThemeToggle />

          <AuthSection />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              }
            />
            <SheetContent side="right" className="w-72">
              <div className="mt-8 flex flex-col gap-4">
                <ExamTypeToggle />
                <div className="flex flex-col gap-1">
                  <NavLinks onNavigate={() => setMobileOpen(false)} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

