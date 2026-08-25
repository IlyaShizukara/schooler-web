"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";

export function AuthSection() {
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
      <Button size="sm" variant="secondary" onClick={() => void logout()} className="gap-2">
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
