"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

import { GuestBanner } from "@/components/guest-banner";
import { SubjectsSkeleton } from "@/components/subjects-skeleton";
import { useAuth } from "@/lib/auth-context";
import { usePublicData } from "@/lib/use-public-data";
import { getSubjectIcon } from "@/lib/subject-icons";
import type { SubjectSummaryItem } from "@/lib/api";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "in_progress" | "not_started";

function SubjectCard({ item }: { item: SubjectSummaryItem }) {
  const Icon = getSubjectIcon(item.icon);
  const color = item.color ?? "var(--primary)";
  const notStarted = item.solved === 0;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <div
        className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-bl-full opacity-40 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
      />
      <div className="relative z-10 mb-4 flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <h3 className="relative z-10 mb-2 text-lg font-bold">{item.name}</h3>
      <p className="relative z-10 mb-6 flex-1 text-sm text-muted-foreground">
        {item.solved > 0
          ? `Точность ${item.accuracy}% · продолжай в том же духе`
          : "Ещё не начато — самое время приступить"}
      </p>
      <div className="relative z-10 mt-auto">
        <div className="mb-2 flex justify-between text-xs font-semibold text-muted-foreground">
          <span>Прогресс</span>
          <span className="font-mono-stat">
            {item.solved} / {item.total}
          </span>
        </div>
        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full"
            style={{ width: `${item.percent}%`, backgroundColor: notStarted ? "var(--border)" : "var(--success)" }}
          />
        </div>
        <Link
          href={`/subjects/${item.slug}`}
          className={cn(
            "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
            notStarted
              ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
              : "border-2 border-primary/20 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground"
          )}
        >
          {notStarted ? "Начать первую практику" : "Продолжить"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function MobileSubjectCard({ item }: { item: SubjectSummaryItem }) {
  const Icon = getSubjectIcon(item.icon);
  const color = item.color ?? "var(--primary)";

  return (
    <div className="glass-panel flex flex-col gap-2 rounded-xl p-3 shadow-sm">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-1 flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">{item.name}</h3>
        <p className="font-mono-stat text-xs font-medium text-muted-foreground">
          {item.solved} / {item.total} заданий
        </p>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-primary" style={{ width: `${item.percent}%` }} />
      </div>
      <Link
        href={`/subjects/${item.slug}`}
        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground"
      >
        Начать практику
        <Play className="h-3 w-3 fill-current" />
      </Link>
    </div>
  );
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Все предметы" },
  { key: "in_progress", label: "В процессе" },
  { key: "not_started", label: "Не начаты" },
];

export default function SubjectsPage() {
  const { auth } = useAuth();
  const confirmed = auth.status === "confirmed";
  // usePublicData вместо useAuthedData — гость тоже должен получить список
  // предметов (просто с solved=0/accuracy=0 по всем, это гарантирует бэкенд).
  const { data: subjects, loading } = usePublicData<SubjectSummaryItem[]>("/api/subjects");
  const [filter, setFilter] = useState<FilterKey>("all");

  const header = (
    <div>
      <h1 className="text-2xl font-bold md:text-3xl">Предметы</h1>
      <p className="text-sm text-muted-foreground md:text-base">Выберите предмет, чтобы продолжить подготовку</p>
    </div>
  );

  if (loading || !subjects) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <SubjectsSkeleton />
      </div>
    );
  }

  const filtered = subjects.filter((s) => {
    if (filter === "in_progress") return s.solved > 0;
    if (filter === "not_started") return s.solved === 0;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {!confirmed && (
        <GuestBanner message="Можно решать задания без входа, но прогресс не сохраняется. Войди, чтобы видеть точность и слабые места по каждому предмету." />
      )}

      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        {header}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                filter === key
                  ? "border-primary/30 bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-surface"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ничего не найдено для этого фильтра.</p>
      ) : (
        <>
          {/* десктоп/планшет: полная карточка */}
          <div className="hidden grid-cols-1 gap-6 sm:grid-cols-2 md:grid md:grid-cols-3">
            {filtered.map((s) => (
              <SubjectCard key={s.slug} item={s} />
            ))}
          </div>
          {/* мобильный: компактная 2-колоночная сетка */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            {filtered.map((s) => (
              <MobileSubjectCard key={s.slug} item={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}