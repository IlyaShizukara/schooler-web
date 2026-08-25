"use client";

import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function GuestPrompt({ message }: { message: string }) {
  const { startLogin } = useAuth();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center">
      <Lock className="h-7 w-7 text-muted-foreground" />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button size="sm" onClick={() => void startLogin()}>
        Войти через Telegram
      </Button>
    </div>
  );
}