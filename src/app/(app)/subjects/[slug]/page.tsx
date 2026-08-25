"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight, Flame, PlayCircle, RotateCcw, Shuffle } from "lucide-react";

import { IconBadge } from "@/components/icon-badge";
import { ProgressBar } from "@/components/progress-bar";
import { GuestPrompt } from "@/components/guest-prompt";
import { TopicsSkeleton } from "@/components/topics-skeleton";
import { useAuth } from "@/lib/auth-context";
import { useAuthedData } from "@/lib/use-authed-data";
import { getSubjectIcon } from "@/lib/subject-icons";
import { pointsWord } from "@/lib/pluralize";
import { DIFFICULTY_COLOR } from "@/lib/difficulty";
import { cn } from "@/lib/utils";
import type { ProbnikHistoryItem, ProfileResponse, SubjectSummaryItem, TopicItem } from "@/lib/api";

type FilterKey = "all" | "weak" | "mastered";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "weak", label: "Слабые" },
  { key: "mastered", label: "Освоенные" },
];

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  const color = tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : undefined;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-mono text-lg font-semibold leading-none" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}

function TopicCard({ topic, slug, index }: { topic: TopicItem; slug: string; index: number }) {
  const avgPoints = topic.total ? Math.round((topic.total_points ?? topic.total) / topic.total) : 1;
  const diffColor = topic.difficulty ? DIFFICULTY_COLOR[topic.difficulty] : "var(--muted-foreground)";
  const isWeak = topic.solved > 0 && topic.accuracy < 60;
  const isMastered = topic.solved > 0 && topic.accuracy >= 80;
  const notStarted = topic.solved === 0;

  let circleText: string;
  if (topic.task_number != null && topic.task_number_to != null && topic.task_number_to !== topic.task_number) {
    circleText = `${topic.task_number}-${topic.task_number_to}`;
  } else if (topic.task_number != null) {
    circleText = String(topic.task_number);
  } else {
    circleText = String(index + 1);
  }

  const accuracyColor =
    topic.solved > 0 ? (topic.accuracy >= 70 ? "var(--success)" : topic.accuracy >= 40 ? "var(--warning)" : "var(--destructive)") : undefined;

  const href = `/subjects/${slug}/solve?topic=${topic.topic_id ?? -1}`;
  const ctaLabel = notStarted ? "Начать" : isMastered ? "Повторить" : "Продолжить";
  const CtaIcon = notStarted ? PlayCircle : isMastered ? RotateCcw : ArrowRight;

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5 transition-all duration-300",
        isWeak
          ? "glass-panel border border-primary/30"
          : "border border-border/60 bg-surface shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(108,37,255,0.12)] dark:border-border dark:shadow-none dark:hover:border-primary/50"
      )}
    >
      {isWeak && <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/25 blur-2xl" />}

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-muted-foreground",
            circleText.length > 2 ? "px-3" : "w-9"
          )}
        >
          {circleText}
        </div>
        {isWeak ? (
          <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            <Flame className="h-3 w-3" />
            Стоит повторить
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        )}
      </div>

      <div className="relative flex flex-col gap-2">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{topic.name}</p>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {topic.difficulty && (
            <span
              className="rounded-md px-2 py-0.5 font-semibold"
              style={{ backgroundColor: `color-mix(in srgb, ${diffColor} 15%, transparent)`, color: diffColor }}
            >
              {topic.difficulty}
            </span>
          )}
          <span className="text-muted-foreground">
            {avgPoints} {pointsWord(avgPoints)}
          </span>
          {topic.solved > 0 && (
            <span className="font-mono font-semibold" style={{ color: accuracyColor }}>
              {topic.accuracy}% верно
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-auto flex flex-col gap-2.5">
        <ProgressBar percent={topic.percent} />
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">
            {topic.solved}/{topic.total}
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              notStarted
                ? "border border-border text-primary group-hover:border-transparent group-hover:bg-primary group-hover:text-primary-foreground"
                : "bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
            )}
          >
            <CtaIcon className="h-3.5 w-3.5" />
            {ctaLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function SubjectTopicsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { auth } = useAuth();
  const confirmed = auth.status === "confirmed";
  const [filter, setFilter] = useState<FilterKey>("all");

  const { data: subjects } = useAuthedData<SubjectSummaryItem[]>("/api/subjects");
  const { data: topics, loading } = useAuthedData<TopicItem[]>(`/api/subjects/${slug}/topics`);
  const { data: profile } = useAuthedData<ProfileResponse>("/api/profile");
  const { data: probnikHistory } = useAuthedData<ProbnikHistoryItem[]>("/api/probnik/history");

  const subjectInfo = subjects?.find((s) => s.slug === slug);
  const subjectName = subjectInfo?.name ?? slug;
  const subjectColor = subjectInfo?.color ?? "var(--primary)";
  const Icon = getSubjectIcon(subjectInfo?.icon);

  const header = (
    <div className="flex items-center gap-2">
      <Link
        href="/subjects"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-lg font-bold">{subjectName}</h1>
    </div>
  );

  if (!confirmed) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <GuestPrompt message="Войдите через Telegram, чтобы видеть свой прогресс по темам и решать задания." />
      </div>
    );
  }

  if (loading || !topics) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <TopicsSkeleton />
      </div>
    );
  }

  const weakTopicsCount = topics.filter((t) => t.solved > 0 && t.accuracy < 60).length;
  const lastProbnik = probnikHistory?.find((p) => p.subject_name === subjectName);
  const lastProbnikText = lastProbnik ? `${lastProbnik.correct_count}/${lastProbnik.total_tasks}` : "—";

  const filteredTopics =
    filter === "weak"
      ? topics.filter((t) => t.solved > 0 && t.accuracy < 60)
      : filter === "mastered"
      ? topics.filter((t) => t.solved > 0 && t.accuracy >= 80)
      : topics;

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-25 blur-3xl"
          style={{ backgroundColor: subjectColor }}
        />
        <div className="relative flex flex-wrap items-center gap-3.5">
          <IconBadge icon={Icon} color={subjectInfo?.color} />
          <div>
            <h2 className="text-base font-bold">{subjectName}</h2>
            <p className="text-xs text-muted-foreground">
              {profile?.exam_type ?? "ЕГЭ"} · {subjectInfo?.total ?? 0} заданий · {subjectInfo?.total_points ?? 0} баллов
            </p>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-4 border-t border-border/60 pt-5 sm:grid-cols-4">
          <MiniStat label="Решено" value={`${subjectInfo?.solved ?? 0}/${subjectInfo?.total ?? 0}`} />
          <MiniStat
            label="Точность"
            value={`${subjectInfo?.accuracy ?? 0}%`}
            tone={subjectInfo && subjectInfo.accuracy >= 70 ? "success" : subjectInfo && subjectInfo.accuracy > 0 && subjectInfo.accuracy < 40 ? "warning" : undefined}
          />
          <MiniStat label="Слабых тем" value={String(weakTopicsCount)} tone={weakTopicsCount > 0 ? "warning" : undefined} />
          <MiniStat label="Последний пробник" value={lastProbnikText} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all",
                filter === key
                  ? "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(108,37,255,0.35)] dark:shadow-[0_0_15px_rgba(108,37,255,0.4)]"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{topics.length} тем</span>
      </div>

      <Link
        href={`/subjects/${slug}/solve`}
        className="group flex items-center justify-between rounded-2xl border border-border/60 bg-surface p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(108,37,255,0.12)] dark:border-border dark:shadow-none dark:hover:border-primary/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Shuffle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Все темы</p>
            <p className="text-xs text-muted-foreground">Случайный порядок заданий</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>

      {filteredTopics.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {topics.length === 0
            ? "Тем для этого предмета ещё не размечено — можно решать без фильтра по теме."
            : "Нет тем в этой категории."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredTopics.map((t, i) => (
            <TopicCard key={t.topic_id ?? i} topic={t} slug={slug} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
