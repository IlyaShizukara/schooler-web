"use client";

import { useState } from "react";
import { Bolt, ChevronRight, Flame, LogOut, Medal, Pencil } from "lucide-react";

import { GuestPrompt } from "@/components/guest-prompt";
import { ProfileEditPanel } from "@/components/profile-edit-panel";
import { useAuth } from "@/lib/auth-context";
import { useAuthedData } from "@/lib/use-authed-data";
import { useProfile } from "@/lib/profile-context";
import type { ProgressSummaryResponse, SubjectSummaryItem, XpSummaryResponse } from "@/lib/api";

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-48 animate-pulse rounded-2xl bg-card" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-2xl bg-card lg:col-span-1" />
        <div className="h-64 animate-pulse rounded-2xl bg-card lg:col-span-2" />
      </div>
    </div>
  );
}

function AccuracyRing({ item }: { item: SubjectSummaryItem }) {
  const circumference = 100; // используем dasharray в процентах от периметра
  const dash = Math.max(0, Math.min(100, item.accuracy));
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-background p-4 text-center">
      <div className="relative mb-2 h-16 w-16">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="stroke-surface-2"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeWidth="3"
          />
          <path
            style={{ stroke: "var(--success)" }}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeDasharray={`${dash}, ${circumference}`}
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
        <div className="font-mono-stat absolute inset-0 flex items-center justify-center text-sm font-semibold">
          {item.accuracy}%
        </div>
      </div>
      <p className="text-xs font-semibold text-muted-foreground">{item.name}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { auth, logout } = useAuth();
  const confirmed = auth.status === "confirmed";
  const [editing, setEditing] = useState(false);

  const { profile, loading: profileLoading, setProfile } = useProfile();
  const { data: subjects, loading: subjectsLoading } = useAuthedData<SubjectSummaryItem[]>("/api/subjects");
  const { data: xp, loading: xpLoading } = useAuthedData<XpSummaryResponse>("/api/xp/summary");
  const { data: progress, loading: progressLoading } = useAuthedData<ProgressSummaryResponse>("/api/progress/summary");

  if (!confirmed) {
    return (
      <div className="pt-4">
        <GuestPrompt message="Войдите через Telegram, чтобы видеть свой профиль." />
      </div>
    );
  }

  const stillLoading = profileLoading || subjectsLoading || xpLoading || progressLoading || !profile || !subjects || !xp || !progress;

  if (stillLoading) {
    return <ProfileSkeleton />;
  }

  const displayName = profile.display_name || (auth.status === "confirmed" ? auth.name : null) || "Без имени";
  const avatarLetter = displayName[0]?.toUpperCase() ?? "?";
  const metaLine = [
    profile.exam_type,
    profile.grade ? `${profile.grade} класс` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const xpProgressPct = Math.min(100, Math.round((xp.xp / (xp.xp + xp.xp_for_next_level)) * 100));
  const attemptedSubjects = subjects.filter((s) => s.solved > 0).sort((a, b) => b.accuracy - a.accuracy).slice(0, 4);
  const weeklyTotal = progress.weekly_activity.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* ---- шапка профиля ---- */}
      <section className="glass-panel relative overflow-hidden rounded-2xl p-6 shadow-sm md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center gap-6 md:flex-row">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-background bg-primary/15 text-3xl font-bold text-primary shadow-lg md:h-32 md:w-32 md:text-4xl">
            {avatarLetter}
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="mb-1 text-3xl font-extrabold text-primary">{displayName}</h1>
            <p className="mb-4 text-muted-foreground">{metaLine || "—"}</p>
            <div className="mx-auto max-w-md md:mx-0">
              <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Уровень {xp.level}</span>
                <span className="font-mono-stat">
                  {xp.xp} / {xp.xp + xp.xp_for_next_level} XP
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-primary" style={{ width: `${xpProgressPct}%` }} />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setEditing((v) => !v)}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-shadow hover:shadow-md"
            >
              <Pencil className="h-4 w-4" />
              Редактировать
            </button>
            {/* ⚠️ В макете была ещё кнопка "Поделиться" — нет фичи публичного
                профиля, оставил только рабочее действие. */}
          </div>
        </div>
      </section>

      {editing && (
        <ProfileEditPanel
          profile={profile}
          subjects={subjects}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setProfile(updated);
            setEditing(false);
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---- левая колонка: достижения ---- */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <h2 className="text-lg font-bold">Достижения</h2>
          {/* ⚠️ Система достижений на бэкенде ещё не реализована (в паспорте
              проекта: "Ачивки — не начато"). Не подделываю выданные значки —
              честная заглушка, как и в прежней версии профиля. */}
          <div className="glass-panel flex flex-col items-center gap-2 rounded-xl p-6 text-center shadow-sm">
            <Medal className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Скоро здесь появятся значки за успехи в подготовке.
            </p>
          </div>

          <div className="glass-panel flex items-center gap-4 rounded-xl p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Стрик {xp.current_streak} дней</p>
              <p className="text-xs text-muted-foreground">Лучший: {xp.longest_streak} дней подряд</p>
            </div>
          </div>
        </div>

        {/* ---- правая колонка: прогресс обучения ---- */}
        <section className="glass-panel flex flex-col rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold">Прогресс обучения</h2>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2">
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-background p-4">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
              <div className="relative z-10">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Решено за неделю</p>
                <p className="font-mono-stat mt-1 text-2xl font-semibold text-primary">{weeklyTotal}</p>
              </div>
              <div className="relative z-10 mt-4 flex h-24 items-end gap-2">
                {progress.weekly_activity.map((p, i) => {
                  const isLast = i === progress.weekly_activity.length - 1;
                  const max = Math.max(...progress.weekly_activity.map((x) => x.count), 1);
                  return (
                    <div
                      key={p.day}
                      className="group relative w-full rounded-t-sm transition-colors"
                      style={{
                        height: `${Math.max((p.count / max) * 100, 6)}%`,
                        backgroundColor: isLast
                          ? "color-mix(in srgb, var(--primary) 55%, transparent)"
                          : "color-mix(in srgb, var(--primary) 20%, transparent)",
                      }}
                    >
                      {isLast && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] font-semibold text-background opacity-0 transition-opacity group-hover:opacity-100">
                          Сегодня
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {attemptedSubjects.length === 0 ? (
                <p className="col-span-2 flex items-center justify-center text-sm text-muted-foreground">
                  Пока нет решённых заданий.
                </p>
              ) : (
                attemptedSubjects.map((s) => <AccuracyRing key={s.slug} item={s} />)
              )}
            </div>
          </div>
        </section>

        {/* ---- настройки: только реально работающие действия ---- */}
        <section className="glass-panel rounded-2xl p-6 shadow-sm lg:col-span-3">
          <h2 className="mb-4 text-lg font-bold">Настройки профиля</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              onClick={() => setEditing(true)}
              className="group flex items-center justify-between rounded-xl border border-border p-4 text-left transition-colors hover:border-primary hover:bg-surface"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted-foreground group-hover:text-primary">
                  <Bolt className="h-[18px] w-[18px]" />
                </div>
                <span className="text-sm font-medium">Основные настройки</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </button>

            <button
              onClick={() => void logout()}
              className="group flex items-center justify-between rounded-xl border border-border p-4 text-left transition-colors hover:border-destructive hover:bg-destructive/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted-foreground group-hover:text-destructive">
                  <LogOut className="h-[18px] w-[18px]" />
                </div>
                <span className="text-sm font-medium">Выйти из аккаунта</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-destructive" />
            </button>
          </div>
          {/* ⚠️ В макете были ещё "Уведомления", "Безопасность", "Связанные
              аккаунты" — этих страниц не существует в проекте, не стал
              оставлять ссылки в никуда. */}
        </section>
      </div>
    </div>
  );
}
