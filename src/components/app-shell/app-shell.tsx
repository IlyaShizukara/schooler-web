"use client";

import { useState } from "react";

import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { MobileTopbar } from "@/components/app-shell/mobile-topbar";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { AiFab } from "@/components/app-shell/ai-fab";
import { AiChatPanel } from "@/components/ai-chat-panel";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { AiChatProvider } from "@/lib/ai-chat-context";
import { ProfileProvider } from "@/lib/profile-context";
import { useAuth } from "@/lib/auth-context";
import { useAuthedData } from "@/lib/use-authed-data";
import type { ProfileResponse } from "@/lib/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  // Решение об онбординге нужно принять до того, как отрендерится
  // <ProfileProvider> (он ниже, внутри "нормальной" ветки) — поэтому здесь
  // свой вызов useAuthedData. Дублирующегося запроса в сеть при этом не
  // будет: и этот вызов, и вызов внутри ProfileProvider читают один и тот
  // же закэшированный ключ "/api/profile" (см. use-authed-data.ts).
  const { data: profile, loading } = useAuthedData<ProfileResponse>("/api/profile");
  const [justCompleted, setJustCompleted] = useState(false);

  const needsOnboarding =
    auth.status === "confirmed" && !loading && profile !== null && !profile.onboarding_completed && !justCompleted;

  if (needsOnboarding) {
    return <OnboardingFlow onComplete={() => setJustCompleted(true)} />;
  }

  return (
    <ProfileProvider>
      <AiChatProvider>
        <div className="min-h-screen bg-page-bg">
          <Sidebar />
          <Topbar />
          <MobileTopbar />

          <main className="min-h-screen px-4 pb-24 pt-[76px] md:ml-64 md:px-8 md:pb-10 md:pt-24">
            <div className="mx-auto w-full max-w-[1200px]">{children}</div>
          </main>

          <AiFab />
          <BottomNav />
          <AiChatPanel />
        </div>
      </AiChatProvider>
    </ProfileProvider>
  );
}