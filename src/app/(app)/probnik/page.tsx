"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, School, TrendingDown, AlertTriangle, Timer as TimerIcon, Sparkles } from "lucide-react";

import { GuestBanner } from "@/components/guest-banner";
import { SubjectsSkeleton } from "@/components/subjects-skeleton";
import { useAuth } from "@/lib/auth-context";
import { useAuthedData } from "@/lib/use-authed-data";
import { usePublicData } from "@/lib/use-public-data";
import { apiGet, apiGetAuth } from "@/lib/api";
import { getSubjectIcon } from "@/lib/subject-icons";
import { useProbnikRun } from "@/lib/probnik-run-context";
import { EXAM_TASK_COUNTS, TIME_OPTIONS, formatDurationShort } from "@/lib/probnik-constants";
import type { ProbnikStartPayload, ProgressSummaryResponse, SubjectSummaryItem, TopicItem } from "@/lib/api";
import { cn } from "@/lib/utils";

type ExamKind = "full" | "part1_only" | "topic";

export default function ProbnikGeneratorPage() {
  const router = useRouter();
  const { auth } = useAuth();
  const confirmed = auth.status === "confirmed";
  const { start, hint } = useProbnikRun();

  // Банк заданий (и темы для режима "topic") открыт и гостю.
  const { data: subjects, loading: subjectsLoading } = usePublicData<SubjectSummaryItem[]>("/api/subjects");
  // Прогресс/слабые места — честно приватны, у гостя их просто нет.
  const { data: progress } = useAuthedData<ProgressSummaryResponse>("/api/progress/summary");

  const [subjectSlug, setSubjectSlug] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [examKind, setExamKind] = useState<ExamKind>("full");
  const [time, setTime] = useState<string>(TIME_OPTIONS[2]);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [taskCount, setTaskCount] = useState(10);
  const [starting, setStarting] = useState(false);

  const [topics, setTopics] = useState<TopicItem[] | null>(null);
  const [topicsLoading, setTopicsLoading] = useState(false);

  useEffect(() => {
    if (!subjectSlug && subjects && subjects.length > 0) {
      setSubjectSlug(subjects[0].slug);
      setSubjectName(subjects[0].name);
    }
  }, [subjects, subjectSlug]);

  useEffect(() => {
    // Раньше здесь был auth.status !== "confirmed" в условии выхода —
    // темы предмета теперь открыты и гостю (content.py::list_topics).
    if (examKind !== "topic" || !subjectSlug) return;
    let cancelled = false;
    setTopicsLoading(true);
    setTopics(null);
    const request =
      auth.status === "confirmed"
        ? apiGetAuth<TopicItem[]>(`/api/subjects/${subjectSlug}/topics`, auth.token)
        : apiGet<TopicItem[]>(`/api/subjects/${subjectSlug}/topics`);
    request
      .then((data) => {
        if (!cancelled) setTopics(data);
      })
      .catch(() => {
        if (!cancelled) setTopics([]);
      })
      .finally(() => {
        if (!cancelled) setTopicsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [examKind, subjectSlug, auth]);

  let realTaskCount = 0;
  if (examKind === "topic") {
    realTaskCount = topicId !== null ? taskCount : 0;
  } else {
    const counts = EXAM_TASK_COUNTS[subjectSlug ?? ""] ?? { part1: 13, part2: 13, total: 26 };
    const requested = examKind === "part1_only" ? counts.part1 : counts.part1 + counts.part2;
    const subjectTotal = subjects?.find((s) => s.slug === subjectSlug)?.total ?? 0;
    realTaskCount = Math.min(requested || counts.total, subjectTotal);
  }

  const canStart = realTaskCount > 0 && subjectSlug !== null;

  async function handleStart() {
    if (!canStart || !subjectSlug) return;
    setStarting(true);
    const parts = examKind === "part1_only" ? ["Часть 1"] : ["Часть 1", "Часть 2"];
    const payload: ProbnikStartPayload = {
      subject_slug: subjectSlug,
      parts,
      topic_id: examKind === "topic" ? topicId : null,
      task_count: examKind === "topic" ? taskCount : null,
    };
    try {
      // start() из контекста сам решает /start или /guest/start в
      // зависимости от auth.status — этой странице не нужно об этом знать.
      await start(payload, examKind === "topic" ? TIME_OPTIONS[2] : time);
      router.push("/probnik/run");
    } catch {
      // ошибка уже показана через hint
    } finally {
      setStarting(false);
    }
  }

  if (subjectsLoading || !subjects) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-extrabold">Генерация пробника</h1>
          <p className="text-muted-foreground">Настройте параметры экзамена для максимальной эффективности.</p>
        </div>
        <SubjectsSkeleton />
      </div>
    );
  }

  const weakSpots = (progress?.weak_spots ?? []).slice(0, 2);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Генерация пробника</h1>
        <p className="text-muted-foreground">Настройте параметры экзамена для максимальной эффективности.</p>
      </div>

      {!confirmed && (
        <GuestBanner message="Можно пройти пробник без входа. Часть 1 проверяется как обычно, но результат нигде не сохранится, а часть 2 — только для самопроверки, без баллов." />
      )}

      {hint && (
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          {hint}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ---- левая колонка: форма ---- */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <section className="glass-panel rounded-xl p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
              <School className="h-5 w-5" />
              Предмет
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {subjects.map((s) => {
                const Icon = getSubjectIcon(s.icon);
                const active = s.slug === subjectSlug;
                return (
                  <button
                    key={s.slug}
                    onClick={() => {
                      setSubjectSlug(s.slug);
                      setSubjectName(s.name);
                      setTopicId(null);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-all",
                      active
                        ? "border-primary bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
                        : "border-border bg-card text-muted-foreground hover:bg-surface"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                    {s.name}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="glass-panel rounded-xl p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
              <Rocket className="h-5 w-5" />
              Тип пробника
            </h3>
            <div className="flex flex-col gap-1">
              {(
                [
                  ["full", "Полный вариант (ЕГЭ)", "Симуляция реального экзамена. Все задания."],
                  ["part1_only", "Только первая часть", "Базовые задания с кратким ответом."],
                  ["topic", "Специфичные темы", "Выбор отдельного блока заданий."],
                ] as [ExamKind, string, string][]
              ).map(([key, title, desc]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-surface"
                >
                  <input
                    type="radio"
                    name="exam_kind"
                    checked={examKind === key}
                    onChange={() => setExamKind(key)}
                    className="mt-1 h-4 w-4 accent-[var(--primary)]"
                  />
                  <div>
                    <div className="text-sm font-medium">{title}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {examKind === "topic" && (
              <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row">
                {topicsLoading || !topics ? (
                  <p className="text-xs text-muted-foreground">Загружаем темы...</p>
                ) : (
                  <select
                    value={topicId ?? ""}
                    onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Выберите тему</option>
                    {topics
                      .filter((t) => t.topic_id !== null)
                      .map((t) => (
                        <option key={t.topic_id} value={t.topic_id ?? undefined}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                )}
                <input
                  type="number"
                  min={1}
                  value={taskCount}
                  onChange={(e) => setTaskCount(Math.max(1, Number(e.target.value) || 10))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary sm:w-32"
                  placeholder="Кол-во заданий"
                />
              </div>
            )}
          </section>

          {examKind !== "topic" && (
            <section className="glass-panel rounded-xl p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-primary">
                <TimerIcon className="h-5 w-5" />
                Время
              </h3>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <span className="text-sm">Ограничение по времени</span>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}
        </div>

        {/* ---- правая колонка: ИИ-анализ (реальные слабые места) + запуск ---- */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <aside className="glass-panel relative overflow-hidden rounded-xl p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative z-10 mb-4 flex items-center gap-3">
              <div className="hex-avatar ai-pulse flex h-8 w-8 items-center justify-center border border-primary/30 bg-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-primary">Анализ Schooler AI</h3>
            </div>
            <div className="relative z-10 flex flex-col gap-2.5">
              <p className="mb-1 text-sm text-muted-foreground">
                Основываясь на ваших результатах, рекомендую сфокусироваться на:
              </p>
              {!confirmed ? (
                <p className="text-sm text-muted-foreground">Доступно после входа — нужна история решённых заданий.</p>
              ) : weakSpots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Пока недостаточно попыток, чтобы выделить слабые места.
                </p>
              ) : (
                weakSpots.map((w) => (
                  <div
                    key={w.subject_name}
                    className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3 shadow-sm"
                  >
                    {w.percent < 40 ? (
                      <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    )}
                    <div>
                      <div className="text-sm font-semibold">{w.subject_name}</div>
                      <div className="text-xs text-muted-foreground">Успешность: {w.percent}%</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          <div className="glass-panel flex flex-col items-center rounded-xl p-6 text-center">
            <div className="font-mono-stat mb-1 text-3xl font-semibold text-primary">{realTaskCount} заданий</div>
            <div className="mb-4 text-sm text-muted-foreground">
              Ожидаемое время: ~{examKind === "topic" ? Math.round(taskCount * 3) : formatDurationShort(time)}
              {examKind === "topic" ? " мин" : ""}
            </div>
            <button
              disabled={!canStart || starting}
              onClick={() => void handleStart()}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold shadow-md transition-all active:scale-[0.98]",
                canStart ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-surface text-muted-foreground"
              )}
            >
              <Rocket className="h-4 w-4" />
              {starting ? "Запускаем..." : canStart ? "Начать экзамен" : "Нет заданий"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}