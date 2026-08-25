"use client";

import { createContext, useCallback, useContext } from "react";

import { useAuth } from "@/lib/auth-context";
import { useAuthedData, mutateAuthedData } from "@/lib/use-authed-data";
import type { ProfileResponse } from "@/lib/api";

interface ProfileContextValue {
  profile: ProfileResponse | null;
  loading: boolean;
  error: unknown;
  /** Подменяет профиль в общем кэше сразу после успешного сохранения — без похода в сеть. */
  setProfile: (next: ProfileResponse) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  const { data: profile, loading, error } = useAuthedData<ProfileResponse>("/api/profile");

  const setProfile = useCallback(
    (next: ProfileResponse) => {
      if (auth.status !== "confirmed") return;
      mutateAuthedData<ProfileResponse>("/api/profile", auth.token, next);
    },
    [auth]
  );

  return <ProfileContext.Provider value={{ profile, loading, error, setProfile }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile должен использоваться внутри <ProfileProvider>");
  return ctx;
}
