"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, GraduationCap, Sparkles, Target } from "lucide-react";

import { getSubjectIcon } from "@/lib/subject-icons";
import { defaultExamDate, formatRuDate, parseRuDateToIso } from "@/lib/onboarding-utils";
import { useAuth } from "@/lib/auth-context";
import { useAuthedData } from "@/lib/use-authed-data";
import { apiPostAuth } from "@/lib/api";
import type { OnboardingPayload, ProfileResponse, SubjectSummaryItem } from "@/lib/api";
import { cn } from "@/lib/utils";

interface WizardState {
  step: 1 | 2 | 3 | 4;
  name: string;
  examType: "ЕГЭ" | "ОГЭ";
  grade: number;
  subjectSlugs: Set<string>;
  examDate: string; // ДД.ММ.ГГГГ
  examDateEdited: boolean;
  dailyGoal: number;
  targetScore: number;
  submitting: boolean;
}

const STEP_LABELS = ["Знакомство", "Экзамен", "Предметы", "Цель"];

const primaryButtonClass =
  "flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_4px_20px_rgba(108,37,255,0.25)] transition-all hover:shadow-[0_10px_30px_rgba(108,37,255,0.35)] dark:shadow-[0_0_15px_rgba(108,37,255,0.4)] disabled:opacity-60 disabled:shadow-none";

function sliderBackground(value: number, min: number, max: number) {
  const pct = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(to right, var(--primary) ${pct}%, var(--surface-2) ${pct}%)`,
  };
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === current
                ? "w-7 bg-primary shadow-[0_0_10px_rgba(108,37,255,0.5)]"
                : i < current
                ? "w-2 bg-primary/40"
                : "w-2 bg-surface-2"
            )}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Шаг {current} из 4 · {STEP_LABELS[current - 1]}
      </span>
    </div>
  );
}

function Card({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-5">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full opacity-25 blur-3xl" style={{ backgroundColor: "var(--success)" }} />

      <div className="relative flex w-full max-w-[460px] flex-col gap-5">
        <div className="flex justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-[0_4px_20px_rgba(108,37,255,0.15)]">
            <Compass className="h-5 w-5" />
          </div>
        </div>
        <StepIndicator current={step} />
        <div className="glass-panel relative overflow-hidden rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-none">
          <div className="relative flex flex-col gap-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Назад
    </button>
  );
}

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const { auth } = useAuth();
  const { data: subjects } = useAuthedData<SubjectSummaryItem[]>("/api/subjects");

  const [w, setW] = useState<WizardState>({
    step: 1,
    name: "",
    examType: "ЕГЭ",
    grade: 11,
    subjectSlugs: new Set(),
    examDate: formatRuDate(defaultExamDate("ЕГЭ", 11)),
    examDateEdited: false,
    dailyGoal: 15,
    targetScore: 80,
    submitting: false,
  });
  const [error, setError] = useState<string | null>(null);

  const gradeOptions = useMemo(() => (w.examType === "ЕГЭ" ? [10, 11] : [8, 9]), [w.examType]);

  function patch(p: Partial<WizardState>) {
    setW((prev) => ({ ...prev, ...p }));
  }

  function pickExamType(examType: "ЕГЭ" | "ОГЭ") {
    const grade = examType === "ЕГЭ" ? 11 : 9;
    patch({
      examType,
      grade,
      examDate: w.examDateEdited ? w.examDate : formatRuDate(defaultExamDate(examType, grade)),
    });
  }

  function pickGrade(grade: number) {
    patch({ grade, examDate: w.examDateEdited ? w.examDate : formatRuDate(defaultExamDate(w.examType, grade)) });
  }

  function toggleSubject(slug: string) {
    const next = new Set(w.subjectSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    patch({ subjectSlugs: next });
  }

  async function submit() {
    if (auth.status !== "confirmed") return;
    setError(null);
    patch({ submitting: true });

    const parsedDate = w.examDate ? parseRuDateToIso(w.examDate) : null;
    if (w.examDate && parsedDate === null) {
      setError("Дата экзамена — в формате ДД.ММ.ГГГГ");
      patch({ submitting: false });
      return;
    }

    const payload: OnboardingPayload = {
      display_name: w.name.trim(),
      exam_type: w.examType,
      grade: w.grade,
      subject_slugs: Array.from(w.subjectSlugs),
      exam_date: parsedDate,
      daily_goal: w.dailyGoal,
      target_score: w.targetScore,
    };

    try {
      await apiPostAuth<ProfileResponse>("/api/profile/onboarding", auth.token, payload);
      onComplete();
    } catch (err) {
      console.error("[onboarding] не удалось сохранить профиль:", err);
      setError("Не удалось сохранить — проверьте соединение и попробуйте ещё раз");
    } finally {
      patch({ submitting: false });
    }
  }

  // ---------- ШАГ 1 ----------
  if (w.step === 1) {
    return (
      <Card step={1}>
        <div className="flex h-16 w-16 items-center justify-center self-center rounded-2xl bg-primary/15 shadow-[0_4px_20px_rgba(108,37,255,0.15)]">
          <Compass className="h-8 w-8 text-primary" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-xl font-bold">Добро пожаловать в Schooler</h1>
          <p className="text-sm text-muted-foreground">Давай познакомимся! Как тебя зовут?</p>
        </div>
        <input
          autoFocus
          value={w.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Твоё имя..."
          className="rounded-xl border border-border bg-surface px-4 py-3.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={() => {
            if (!w.name.trim()) {
              setError("Введите имя");
              return;
            }
            setError(null);
            patch({ step: 2 });
          }}
          className={primaryButtonClass}
        >
          Продолжить
          <ArrowRight className="h-4 w-4" />
        </button>
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
      </Card>
    );
  }

  // ---------- ШАГ 2 ----------
  if (w.step === 2) {
    return (
      <Card step={2}>
        <h1 className="text-xl font-bold">Привет, {w.name.trim() || "друг"}! 👋</h1>
        <p className="text-sm text-muted-foreground">К какому экзамену готовишься?</p>
        <div className="flex gap-3">
          {(["ОГЭ", "ЕГЭ"] as const).map((t) => {
            const selected = w.examType === t;
            return (
              <button
                key={t}
                onClick={() => pickExamType(t)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-4 transition-all",
                  selected
                    ? "border-primary bg-primary/10 shadow-[0_4px_14px_rgba(108,37,255,0.15)] dark:shadow-[0_0_15px_rgba(108,37,255,0.4)]"
                    : "border-border bg-surface hover:border-primary/40 hover:bg-surface-2"
                )}
              >
                <GraduationCap className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-base font-bold", selected && "text-primary")}>{t}</span>
                <span className="text-[11px] text-muted-foreground">{t === "ОГЭ" ? "9 класс" : "11 класс"}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Класс</p>
        <div className="flex gap-2.5">
          {gradeOptions.map((g) => {
            const selected = w.grade === g;
            return (
              <button
                key={g}
                onClick={() => pickGrade(g)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all",
                  selected
                    ? "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(108,37,255,0.35)] dark:shadow-[0_0_15px_rgba(108,37,255,0.4)]"
                    : "border border-border bg-surface text-muted-foreground hover:bg-surface-2"
                )}
              >
                {g} класс
              </button>
            );
          })}
        </div>
        <div className="flex gap-3">
          <BackButton onClick={() => patch({ step: 1 })} />
          <button onClick={() => patch({ step: 3 })} className={cn(primaryButtonClass, "flex-1")}>
            Продолжить
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Card>
    );
  }

  // ---------- ШАГ 3 ----------
  if (w.step === 3) {
    const canContinue = w.subjectSlugs.size > 0;
    return (
      <Card step={3}>
        <h1 className="text-xl font-bold">Выбери предметы</h1>
        <p className="text-sm text-muted-foreground">Какие предметы сдаёшь? Выбери хотя бы один.</p>
        {!subjects ? (
          <div className="flex justify-center py-8 text-sm text-muted-foreground">Загружаем список предметов...</div>
        ) : (
          <div className="grid max-h-72 grid-cols-2 gap-2.5 overflow-y-auto pr-1">
            {subjects.map((s) => {
              const Icon = getSubjectIcon(s.icon);
              const selected = w.subjectSlugs.has(s.slug);
              return (
                <button
                  key={s.slug}
                  onClick={() => toggleSubject(s.slug)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl border p-3.5 text-left transition-all",
                    selected
                      ? "border-primary bg-primary/10 shadow-[0_4px_14px_rgba(108,37,255,0.15)] dark:shadow-[0_0_15px_rgba(108,37,255,0.4)]"
                      : "border-border bg-surface hover:border-primary/40 hover:bg-surface-2"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: s.color ?? "var(--primary)" }} />
                    <span className="text-sm">{s.name}</span>
                  </span>
                  {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-3">
          <BackButton onClick={() => patch({ step: 2 })} />
          <button
            disabled={!canContinue}
            onClick={() => patch({ step: 4 })}
            className={cn(primaryButtonClass, "flex-1", !canContinue && "bg-surface-2 text-muted-foreground shadow-none")}
          >
            Продолжить
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Card>
    );
  }

  // ---------- ШАГ 4 ----------
  return (
    <Card step={4}>
      <h1 className="text-xl font-bold">Поставь цель</h1>
      <p className="text-sm text-muted-foreground">Настрой план подготовки под себя.</p>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Дата экзамена</label>
        <input
          value={w.examDate}
          onChange={(e) => patch({ examDate: e.target.value, examDateEdited: true })}
          placeholder="ДД.ММ.ГГГГ"
          className="rounded-xl border border-border bg-surface px-4 py-3.5 font-mono text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            Ежедневная цель
          </span>
          <span className="font-mono font-semibold text-primary">{w.dailyGoal} задан.</span>
        </div>
        <input
          type="range"
          min={5}
          max={50}
          value={w.dailyGoal}
          onChange={(e) => patch({ dailyGoal: Number(e.target.value) })}
          style={sliderBackground(w.dailyGoal, 5, 50)}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[var(--primary)]"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>5 — лайт</span>
          <span>50 — интенсив</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Целевой балл
          </span>
          <span className="font-mono font-semibold text-primary">{w.targetScore} / 100</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={w.targetScore}
          onChange={(e) => patch({ targetScore: Number(e.target.value) })}
          style={sliderBackground(w.targetScore, 0, 100)}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[var(--primary)]"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>0 (мин.)</span>
          <span>100 (макс.)</span>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-3">
        <BackButton onClick={() => patch({ step: 3 })} />
        <button
          disabled={w.submitting}
          onClick={() => void submit()}
          className={cn(primaryButtonClass, "flex-1", w.submitting && "bg-surface-2 text-muted-foreground shadow-none")}
        >
          {w.submitting ? (
            "Сохраняем..."
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Начать подготовку!
            </>
          )}
        </button>
      </div>
    </Card>
  );
}
