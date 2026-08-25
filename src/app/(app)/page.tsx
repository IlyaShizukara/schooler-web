"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Flame, Play, Sparkles, Target, TrendingUp } from "lucide-react";

import { GuestPrompt } from "@/components/guest-prompt";
import { useAuth } from "@/lib/auth-context";
import { useAuthedData } from "@/lib/use-authed-data";
import { getSubjectIcon } from "@/lib/subject-icons";
import { daysAndHoursUntil, daysUntil } from "@/lib/date-utils";
import type { ProfileResponse, ProgressSummaryResponse, SubjectSummaryItem, XpSummaryResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-32 animate-pulse rounded-xl bg-card md:h-40" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-card" />
    </div>
  );
}

function StatNum({ children }: { children: React.ReactNode }) {
  return <span className="font-mono-stat text-xl font-semibold tracking-tight md:text-[22px]">{children}</span>;
}

function SubjectTaskRow({ item }: { item: SubjectSummaryItem }) {
  const Icon = getSubjectIcon(item.icon);
  const weak = item.solved > 0 && item.accuracy < 60;
  return (
    <div className="group flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:border-primary/50">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60",
          weak ? "bg-destructive/10 text-destructive" : "bg-surface text-muted-foreground group-hover:text-primary"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold">{item.name}</h4>
          {weak ? (
            <span className="rounded bg-destructive/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
              Слабое место
            </span>
          ) : (
            <span className="rounded bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {item.percent}% пройдено
            </span>
          )}
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          {item.solved}/{item.total} решено · точность {item.accuracy}%
        </p>
      </div>
      <Link
        href={`/subjects/${item.slug}`}
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Play className="h-4 w-4 fill-current" />
      </Link>
    </div>
  );
}

export default function HomePage() {
  const { auth } = useAuth();
  const confirmed = auth.status === "confirmed";
  const displayName = confirmed ? auth.name ?? "Ученик" : "Гость";

  const { data: profile } = useAuthedData<ProfileResponse>("/api/profile");
  const { data: progress, loading: progressLoading } = useAuthedData<ProgressSummaryResponse>("/api/progress/summary");
  const { data: xp } = useAuthedData<XpSummaryResponse>("/api/xp/summary");

  if (!confirmed) {
    return (
      <div className="pt-4">
        <GuestPrompt message="Войдите через Telegram, чтобы видеть свой прогресс и продолжать подготовку." />
      </div>
    );
  }

  if (progressLoading || !progress) {
    return <HomeSkeleton />;
  }

  const subjects = progress.by_subject.slice(0, 4);
  const weekly = progress.weekly_activity;
  const maxCount = Math.max(...weekly.map((p) => p.count), 1);

  const countdown = profile?.exam_date ? daysAndHoursUntil(profile.exam_date) : null;
  const daysLeft = profile?.exam_date ? daysUntil(profile.exam_date) : null;

  const xpProgressPct = xp ? Math.min(100, Math.round((xp.xp / (xp.xp + xp.xp_for_next_level)) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* ============ МОБИЛЬНАЯ ВЕРСИЯ (< md) ============ */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-1 text-sm text-muted-foreground">С возвращением,</p>
            <h1 className="text-2xl font-bold">Привет, {displayName}!</h1>
          </div>
          {daysLeft !== null && (
            <div className="flex flex-col items-end rounded-xl border border-border bg-card p-3">
              <span className="font-mono-stat text-2xl font-semibold text-primary">{Math.max(daysLeft, 0)}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                дней до {profile?.exam_type ?? "экзамена"}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex h-28 flex-col justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <Flame className="h-5 w-5 text-warning" />
              <StatNum>{xp?.current_streak ?? 0}</StatNum>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Ударный режим</span>
          </div>
          <div className="flex h-28 flex-col justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <StatNum>{progress.total_solved}</StatNum>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Решено заданий</span>
          </div>
          <div className="col-span-2 flex h-28 items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Точность
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono-stat text-2xl font-semibold">{progress.accuracy}%</span>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-primary">
              <Target className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold">Продолжить изучение</h2>
            <Link href="/subjects" className="text-xs font-bold text-primary">
              Все предметы
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Выберите предметы в профиле.</p>
            ) : (
              subjects.slice(0, 2).map((s) => <SubjectTaskRow key={s.slug} item={s} />)
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Активность (7 дней)
          </h2>
          <div className="flex h-32 items-end justify-between">
            {weekly.map((p, i) => {
              const isLast = i === weekly.length - 1;
              const h = Math.max((p.count / maxCount) * 100, 4);
              return (
                <div key={p.day} className="flex flex-col items-center gap-2">
                  <div
                    className="w-6 rounded-t-sm"
                    style={{
                      height: `${h}%`,
                      backgroundColor: isLast ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
                    }}
                  />
                  <span
                    className={cn("text-[10px] font-semibold", isLast ? "text-primary" : "text-muted-foreground")}
                  >
                    {p.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============ ДЕСКТОПНАЯ ВЕРСИЯ (>= md) ============ */}
      <div className="hidden flex-col gap-8 md:flex">
        <div className="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-xl border border-border bg-card p-8 md:flex-row">
          <div className="relative z-10">
            <h1 className="mb-2 text-[32px] font-bold leading-tight">Привет, {displayName}! 👋</h1>
            <p className="text-lg text-muted-foreground">
              Твой следующий рубеж — {profile?.exam_type ?? "экзамен"}
              {profile?.subject_slugs?.[0] ? "" : ""}.
            </p>
          </div>
          {countdown && (
            <div className="relative z-10 flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-col items-center">
                <span className="font-mono-stat text-3xl font-semibold text-primary">{countdown.days}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Дней</span>
              </div>
              <span className="text-xl font-bold text-muted-foreground">:</span>
              <div className="flex flex-col items-center">
                <span className="font-mono-stat text-3xl font-semibold text-primary">{countdown.hours}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Часов</span>
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-primary/10 to-transparent md:block" />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Стрик занятий</p>
              <p className="font-mono-stat mt-1 text-xl font-semibold">{xp?.current_streak ?? 0} дней</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Решено заданий</p>
              <p className="font-mono-stat mt-1 text-xl font-semibold">{progress.total_solved}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Точность</p>
              <p className="font-mono-stat mt-1 text-xl font-semibold">{progress.accuracy}%</p>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
            <div className="flex items-end justify-between">
              <p className="text-xs text-muted-foreground">Уровень {xp?.level ?? 1}</p>
              <p className="font-mono-stat text-sm font-bold text-primary">{xpProgressPct}%</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-border bg-surface">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${xpProgressPct}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <section className="col-span-2 flex flex-col rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Target className="h-5 w-5 text-primary" />
                Продолжить изучение
              </h3>
              <Link href="/subjects" className="flex items-center text-sm font-bold text-primary hover:underline">
                Все предметы <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              {subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Выберите предметы в профиле, чтобы видеть их здесь.</p>
              ) : (
                subjects.map((s) => <SubjectTaskRow key={s.slug} item={s} />)
              )}
            </div>
          </section>

          {/* ⚠️ Замена «Лога активности» из референса — у нас нет API истории
              событий. Показываем реальные слабые места вместо выдуманных
              таймстампов. */}
          <aside className="flex flex-col rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Слабые места
              </h3>
            </div>
            <div className="flex-1 space-y-4">
              {progress.weak_spots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Пока недостаточно попыток, чтобы выделить слабые места.</p>
              ) : (
                progress.weak_spots.map((w) => (
                  <div key={w.subject_name}>
                    <div className="mb-1.5 flex items-center justify-between text-sm font-semibold">
                      <span>{w.subject_name}</span>
                      <span style={{ color: w.color }}>{w.percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full" style={{ width: `${w.percent}%`, backgroundColor: w.color }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          <section className="col-span-2 flex flex-col rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <TrendingUp className="h-5 w-5 text-primary" />
                Активность (7 дней)
              </h3>
            </div>
            <div className="flex h-40 flex-1 items-end justify-between gap-2 border-b border-border pb-2 pt-4">
              {weekly.map((p, i) => {
                const isLast = i === weekly.length - 1;
                return (
                  <div key={p.day} className="group relative flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-sm transition-colors"
                      style={{
                        height: `${Math.max((p.count / maxCount) * 100, 4)}%`,
                        backgroundColor: isLast
                          ? "var(--primary)"
                          : "color-mix(in srgb, var(--primary) 30%, transparent)",
                      }}
                    >
                      <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        {p.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{weekly[0]?.day ?? ""}</span>
              <span>Сегодня</span>
            </div>
          </section>

          {/* ⚠️ Замена лидерборда — реального рейтинга по XP на бэкенде ещё нет
              ("Лидерборд по XP — не начато" в паспорте проекта). Используем
              слот под будущего ИИ-репетитора вместо выдуманных студентов. */}
          <aside className="flex flex-col items-center justify-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
            <div className="hex-avatar flex h-12 w-12 items-center justify-center bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-sm font-bold">ИИ-репетитор</h3>
            <p className="text-xs text-muted-foreground">
              Скоро здесь появятся персональные подсказки на основе твоих ошибок.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
