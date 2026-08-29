"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  Flag,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";

import { GuestBanner } from "@/components/guest-banner";
import { MathContent } from "@/components/math-content";
import { proxiedMediaUrl } from "@/lib/math-content";
import { useAuth } from "@/lib/auth-context";
import { useProbnikRun } from "@/lib/probnik-run-context";
import { formatElapsed, formatRemaining } from "@/lib/probnik-constants";
import type { ProbnikReviewTask } from "@/lib/api";
import { cn } from "@/lib/utils";

function NavPill({
  label,
  state,
  onClick,
}: {
  label: string;
  state: "current" | "answered" | "flagged" | "default";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold transition-colors",
        state === "current" && "border-primary bg-primary text-primary-foreground",
        state === "answered" && "border-success/40 bg-success/15 text-success",
        state === "flagged" && "border-warning/50 bg-warning/15 text-warning",
        state === "default" && "border-border bg-card text-muted-foreground hover:bg-surface"
      )}
    >
      {label}
    </button>
  );
}

export default function ProbnikRunPage() {
  const router = useRouter();
  const { auth } = useAuth();
  const {
    state,
    pickOption,
    setAnswerText,
    submitAnswer,
    goNext,
    jumpTo,
    toggleFlag,
    forceFinish,
    jumpReview,
    setGradeDraft,
    submitSelfGrade,
    reset,
    hint,
  } = useProbnikRun();

  const [, forceTick] = useState(0);

  useEffect(() => {
    if (state.phase !== "active") return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === "active" && state.deadline - Date.now() <= 0) {
      void forceFinish();
    }
  }, [state, forceFinish]);

  // Раньше здесь дополнительно проверялось auth.status !== "confirmed" —
  // гость теперь тоже может иметь активный/завершённый пробник в state
  // (см. probnik-run-context.tsx, ветка isGuest), так что единственная
  // причина показать пустой экран — реально отсутствующий прогон.
  if (state.phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-muted-foreground">Активный пробник не найден.</p>
        <Link href="/probnik" className="text-sm font-semibold text-primary">
          Вернуться к генератору
        </Link>
      </div>
    );
  }

  function backToForm() {
    reset();
    router.push("/probnik");
  }

  if (state.phase === "finishing") {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center text-sm text-muted-foreground">
        Подводим итоги...
      </div>
    );
  }

  /* ============ РАЗБОР РЕЗУЛЬТАТОВ ============ */
  if (state.phase === "review") {
    const { review, isGuest, note } = state;
    const rt: ProbnikReviewTask = review.tasks[state.currentIndex];
    const big = review.percent >= 70 ? "var(--success)" : review.percent >= 40 ? "var(--warning)" : "var(--destructive)";

    // ⚠️ Разбивка по темам недоступна (в review.tasks нет поля topic) —
    // честная замена: реальная разбивка по частям (Часть 1 / Часть 2).
    const part1Tasks = review.tasks.filter((t) => t.part === 1);
    const part2Tasks = review.tasks.filter((t) => t.part === 2);
    const part1Correct = part1Tasks.filter((t) => t.is_correct).length;
    const part2Graded = part2Tasks.filter((t) => t.self_graded_points != null);
    const part2Earned = part2Graded.reduce((s, t) => s + (t.self_graded_points ?? 0), 0);
    const part2Max = part2Tasks.reduce((s, t) => s + t.points, 0);

    const draftValue = state.gradeDraft[rt.id] ?? (rt.self_graded_points != null ? String(rt.self_graded_points) : "");

    function saveGrade() {
      const raw = draftValue.trim().replace(",", ".");
      const value = Math.round(Number(raw));
      if (Number.isNaN(value) || value < 0 || value > rt.points) return;
      void submitSelfGrade(rt.id, value);
    }

    return (
      <div className="flex flex-col gap-6">
        {/* ---- герой: итоговый балл ---- */}
        <section className="glass-panel flex flex-col items-center gap-4 rounded-xl p-8 text-center">
          <Trophy className="h-10 w-10" style={{ color: big }} />
          <div>
            <div className="font-mono-stat text-5xl font-semibold" style={{ color: big }}>
              {review.secondary_score ?? `${review.percent}%`}
              {review.secondary_score != null && <span className="text-2xl text-muted-foreground"> / 100</span>}
            </div>
            {review.math_basic_grade != null && (
              <p className="mt-1 text-lg font-bold" style={{ color: big }}>
                Оценка: {review.math_basic_grade}
              </p>
            )}
            {isGuest && (
              <p className="mt-1 text-xs text-muted-foreground">
                {part2Max > 0 ? "По части 1 — часть 2 в баллы не входит, см. ниже" : "По части 1"}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Верно {review.earned_points} из {review.total_points} баллов{isGuest && part2Max > 0 ? " (часть 1)" : ""}
          </p>

          {isGuest && note && (
            <div className="w-full rounded-xl border border-primary/20 bg-primary/5 p-4 text-left text-sm text-muted-foreground">
              {note}
            </div>
          )}

          <div className="grid w-full grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-3">
            <div>
              <div className="font-mono-stat text-lg font-semibold">{formatElapsed(state.elapsedSeconds)}</div>
              <div className="text-xs text-muted-foreground">Время</div>
            </div>
            <div>
              <div className="font-mono-stat text-lg font-semibold">
                {part1Correct}/{part1Tasks.length}
              </div>
              <div className="text-xs text-muted-foreground">Часть 1 верно</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="font-mono-stat text-lg font-semibold">
                {part2Max === 0 ? "—" : isGuest ? "После входа" : `${part2Earned}/${part2Max}`}
              </div>
              <div className="text-xs text-muted-foreground">Часть 2 баллы</div>
            </div>
          </div>

          {isGuest ? (
            <GuestBanner message="Войди, чтобы получить баллы по части 2, официальный вторичный балл и сохранить историю пробников." />
          ) : (
            <button
              onClick={backToForm}
              className="mt-2 w-full max-w-xs rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground sm:w-auto sm:px-10"
            >
              Готово
            </button>
          )}
        </section>

        {/* ---- детализация: таблица ответов ---- */}
        <section className="glass-panel overflow-hidden rounded-xl">
          <div className="border-b border-border p-5">
            <h3 className="text-lg font-bold">Детализация ответов</h3>
          </div>
          <div className="divide-y divide-border">
            {review.tasks.map((t, i) => {
              const status =
                t.part === 2
                  ? t.self_graded_points != null
                    ? "graded"
                    : "pending"
                  : !t.answered
                  ? "skipped"
                  : t.is_correct
                  ? "correct"
                  : "wrong";
              return (
                <button
                  key={t.id}
                  onClick={() => jumpReview(i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-surface",
                    i === state.currentIndex && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono-stat w-8 text-sm text-muted-foreground">
                      №{t.task_number ?? i + 1}
                    </span>
                    <span className="text-sm">{t.part === 2 ? "Развёрнутый ответ" : "Задание части 1"}</span>
                  </div>
                  {status === "correct" && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {status === "wrong" && <XCircle className="h-5 w-5 text-destructive" />}
                  {status === "skipped" && <span className="text-xs font-semibold text-muted-foreground">Пропущено</span>}
                  {status === "graded" && (
                    <span className="font-mono-stat text-sm font-bold text-success">
                      {t.self_graded_points}/{t.points}
                    </span>
                  )}
                  {status === "pending" && (
                    <span className="rounded-full bg-warning/15 px-2 py-1 text-xs font-bold text-warning">
                      {isGuest ? "После входа" : "Оценить"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ---- детальный разбор текущего задания ---- */}
        <section className="glass-panel rounded-xl p-6">
          <p className="mb-4 text-xs font-semibold text-muted-foreground">
            Задание {rt.task_number ?? state.currentIndex + 1}
          </p>
          <MathContent text={rt.question} className="mb-4 text-sm leading-relaxed" />
          {(rt.image_urls ?? []).map((url) => (
            <div key={url} className="mb-4 flex justify-center rounded-xl bg-white p-3">
              <img src={proxiedMediaUrl(url)} alt="" className="max-h-[360px] rounded-lg object-contain" />
            </div>
          ))}

          {rt.part === 1 ? (
            <div className="flex flex-col gap-3">
              {!rt.answered ? (
                <p className="text-sm text-muted-foreground">Без ответа</p>
              ) : (
                <>
                  <p className="text-sm">
                    Ваш ответ:{" "}
                    {rt.task_type === "mcq" && rt.options && rt.selected_index != null
                      ? rt.options[rt.selected_index] ?? "—"
                      : rt.answer_text ?? "—"}
                  </p>
                  {!rt.is_correct && (
                    <p className="text-sm text-muted-foreground">
                      Правильный ответ:{" "}
                      {rt.correct_answer_text ?? (rt.correct_index != null ? rt.options?.[rt.correct_index] : null) ?? "—"}
                    </p>
                  )}
                </>
              )}
              {rt.explanation && <MathContent text={rt.explanation} className="text-sm" />}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {rt.criteria && (
                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="mb-2 text-sm font-bold text-primary">Критерии оценивания</p>
                  <MathContent text={rt.criteria} className="text-sm" />
                </div>
              )}
              {rt.explanation && (
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="mb-2 text-sm font-bold">Решение</p>
                  <MathContent text={rt.explanation} className="text-sm" />
                </div>
              )}
              {isGuest ? (
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                  <p className="mb-3 text-sm font-semibold">
                    Самооценка части 2 доступна после входа — сохранится вместе с остальным прогрессом.
                  </p>
                  <GuestBanner message="Войти, чтобы оценить это задание и сохранить результат." />
                </div>
              ) : (
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                  <p className="mb-3 text-sm font-semibold">Сколько баллов вы себе ставите (макс. {rt.points})?</p>
                  <div className="flex items-center gap-2.5">
                    <input
                      value={draftValue}
                      onChange={(e) => setGradeDraft(rt.id, e.target.value)}
                      placeholder={`0–${rt.points}`}
                      className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <button onClick={saveGrade} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                      Сохранить
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    );
  }

  /* ============ ПРОХОЖДЕНИЕ ============ */
  const task = state.tasks[state.currentIndex];
  const isAnswered = state.answeredIndices.has(state.currentIndex);
  const isFlagged = state.flaggedIndices.has(state.currentIndex);
  const isPartTwo = task.part === 2;
  const isLast = state.currentIndex + 1 >= state.tasks.length;
  const options = task.options ?? [];
  const remaining = state.deadline - Date.now();

  function pillState(index: number): "current" | "answered" | "flagged" | "default" {
    if (state.phase !== "active") return "default";
    if (index === state.currentIndex) return "current";
    if (state.flaggedIndices.has(index)) return "flagged";
    if (state.answeredIndices.has(index)) return "answered";
    return "default";
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ---- левая колонка: навигация по заданиям ---- */}
      <aside className="glass-panel h-fit rounded-xl p-4 lg:w-64 lg:shrink-0">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-bold">{state.subjectName}</span>
          <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: remaining < 300_000 ? "var(--destructive)" : undefined }}>
            <Timer className="h-4 w-4" />
            {formatRemaining(state.deadline)}
          </div>
        </div>
        {state.isGuest && (
          <p className="mb-3 text-xs text-muted-foreground">Результат не сохранится — вы не вошли в аккаунт.</p>
        )}
        <div className="grid grid-cols-6 gap-2 lg:grid-cols-4">
          {state.tasks.map((t, i) => (
            <NavPill key={t.id} label={String(t.task_number ?? i + 1)} state={pillState(i)} onClick={() => jumpTo(i)} />
          ))}
        </div>
        <button
          onClick={() => void forceFinish()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/5"
        >
          <Flag className="h-4 w-4" />
          Завершить пробник
        </button>
      </aside>

      {/* ---- правая колонка: текущее задание ---- */}
      <div className="flex flex-1 flex-col gap-4">
        {hint && (
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">{hint}</div>
        )}

        <div className="glass-panel rounded-xl p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">
                Задание {state.currentIndex + 1} из {state.tasks.length}
              </span>
              {isPartTwo && (
                <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning">
                  Часть 2 · развёрнутый ответ
                </span>
              )}
            </div>
            <button
              onClick={() => toggleFlag(state.currentIndex)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors",
                isFlagged ? "bg-warning/15 text-warning" : "text-muted-foreground hover:bg-surface"
              )}
            >
              {isFlagged ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {isFlagged ? "Отмечено" : "Отметить"}
            </button>
          </div>

          <MathContent text={task.question} className="text-sm leading-relaxed" />
          {(task.image_urls ?? []).map((url) => (
            <div key={url} className="mt-4 flex justify-center rounded-xl bg-white p-3">
              <img src={proxiedMediaUrl(url)} alt="" className="max-h-[360px] rounded-lg object-contain" />
            </div>
          ))}
        </div>

        {isPartTwo ? (
          <>
            <div className="glass-panel flex items-start gap-2.5 rounded-xl p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-sm">
                Решите это задание на бумаге. После сдачи пробника нужно будет самостоятельно проверить его по
                критериям{state.isGuest ? "" : " и выставить себе баллы"}.
              </p>
            </div>
            <button
              onClick={() => void goNext()}
              className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground"
            >
              {isLast ? "Завершить пробник" : "Далее"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : task.task_type === "mcq" ? (
          <>
            <div className="flex flex-col gap-2.5">
              {options.map((opt, idx) => {
                const selected = state.selectedIndex === idx;
                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => pickOption(idx)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border p-3.5 text-left text-sm transition-colors",
                      selected ? "border-primary bg-primary/10" : "border-border bg-card",
                      isAnswered && "opacity-70"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border",
                        selected ? "border-primary bg-primary" : "border-muted-foreground"
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {!isAnswered ? (
              <button
                disabled={state.selectedIndex === null}
                onClick={() => void submitAnswer()}
                className={cn(
                  "rounded-xl px-4 py-3.5 text-sm font-bold",
                  state.selectedIndex !== null ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"
                )}
              >
                Ответить
              </button>
            ) : (
              <button
                onClick={() => void goNext()}
                className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground"
              >
                {isLast ? "Завершить" : "Далее"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <input
                value={state.answerText}
                readOnly={isAnswered}
                onChange={(e) => setAnswerText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isAnswered && void submitAnswer()}
                placeholder="Ваш ответ"
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3.5 text-sm outline-none focus:border-primary"
              />
              {!isAnswered && (
                <button
                  onClick={() => void submitAnswer()}
                  className="rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground"
                >
                  Ответить
                </button>
              )}
            </div>
            {isAnswered && (
              <button
                onClick={() => void goNext()}
                className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground"
              >
                {isLast ? "Завершить" : "Далее"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}