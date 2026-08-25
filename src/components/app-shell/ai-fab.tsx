"use client";

import { Bot } from "lucide-react";

export function AiFab() {
  return (
    <button
      className="ai-pulse hex-avatar fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center border border-primary/50 bg-card transition-transform active:scale-95 md:hidden"
      aria-label="ИИ-репетитор (скоро)"
    >
      <div className="hex-avatar flex h-12 w-12 items-center justify-center bg-primary">
        <Bot className="h-5 w-5 text-white" />
      </div>
    </button>
  );
}
