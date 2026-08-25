"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

import { getSubjectIcon } from "@/lib/subject-icons";
import { formatRuDate, parseRuDateToIso } from "@/lib/onboarding-utils";
import { useAuth } from "@/lib/auth-context";
import { apiPostAuth } from "@/lib/api";
import type { OnboardingPayload, ProfileResponse, SubjectSummaryItem } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ProfileEditPanel({
  profile,
  subjects,
  onSaved,
  onCancel,
}: {
  profile: ProfileResponse;
  subjects: SubjectSummaryItem[];
  onSaved: (updated: ProfileResponse) => void;
  onCancel: () => void;
}) {
  const { auth } = useAuth();

  const [examType, setExamType] = useState<"ЕГЭ" | "ОГЭ">(profile.exam_type ?? "ЕГЭ");
  const [grade, setGrade] = useState(profile.grade ?? 11);
  const [subjectSlugs, setSubjectSlugs] = useState<Set<string>>(new Set(profile.subject_slugs));
  const [examDate, setExamDate] = useState(
    profile.exam_date ? formatRuDate(new Date(`${profile.exam_date}T00:00:00`)) : ""
  );
  const [dailyGoal, setDailyGoal] = useState(profile.daily_goal ?? 15);
  const [targetScore, setTargetScore] = useState(profile.target_score ?? 80);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const gradeOptions = useMemo(() => (examType === "ЕГЭ" ? [10, 11] : [8, 9]), [examType]);

  function toggleSubject(slug: string) {
    const next = new Set(subjectSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSubjectSlugs(next);
  }

  async function save() {
    if (auth.status !== "confirmed") return;
    if (subjectSlugs.size === 0) {
      setError("Выберите хотя бы один предмет");
      return;
    }
    const parsedDate = examDate ? parseRuDateToIso(examDate) : null;
    if (examDate && parsedDate === null) {
      setError("Дата экзамена — в формате ДД.ММ.ГГГГ");
      return;
    }
    setError(null);
    setSaving(true);

    const payload: OnboardingPayload = {
      display_name: profile.display_name ?? "",
      exam_type: examType,
      grade,
      subject_slugs: Array.from(subjectSlugs),
      exam_date: parsedDate,
      daily_goal: dailyGoal,
      target_score: targetScore,
    };

    try {
      const updated = await apiPostAuth<ProfileResponse>("/api/profile/onboarding", auth.token, payload);
      onSaved(updated);
    } catch (err) {
      console.error("[profile] не удалось сохранить профиль:", err);
      setError("Не удалось сохранить — проверьте соединение");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-primary bg-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Редактирование профиля</h2>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Экзамен</span>
        <div className="flex gap-3">
          {(["ОГЭ", "ЕГЭ"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setExamType(t);
                setGrade(t === "ЕГЭ" ? 11 : 9);
              }}
              className={cn(
                "flex-1 rounded-xl border p-3.5 text-sm font-semibold",
                examType === t ? "border-primary/60 bg-primary/10 text-primary" : "border-border bg-surface-2"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Класс</span>
        <div className="flex gap-2.5">
          {gradeOptions.map((g) => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium",
                grade === g ? "border border-primary/60 bg-primary/15 text-primary" : "border border-border bg-surface-2 text-muted-foreground"
              )}
            >
              {g} класс
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Дата экзамена</span>
        <input
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          placeholder="ДД.ММ.ГГГГ"
          className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Предметы</span>
        <div className="grid max-h-56 grid-cols-2 gap-2.5 overflow-y-auto">
          {subjects.map((s) => {
            const Icon = getSubjectIcon(s.icon);
            const selected = subjectSlugs.has(s.slug);
            return (
              <button
                key={s.slug}
                onClick={() => toggleSubject(s.slug)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border p-3 text-left",
                  selected ? "border-primary/60 bg-primary/10" : "border-border bg-surface-2"
                )}
              >
                <span className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4" style={{ color: s.color ?? "var(--primary)" }} />
                  {s.name}
                </span>
                {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span>Ежедневная цель</span>
          <span className="font-semibold text-primary">{dailyGoal} задан.</span>
        </div>
        <input
          type="range"
          min={5}
          max={50}
          value={dailyGoal}
          onChange={(e) => setDailyGoal(Number(e.target.value))}
          className="accent-[var(--primary)]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span>Целевой балл</span>
          <span className="font-semibold text-primary">{targetScore} / 100</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={targetScore}
          onChange={(e) => setTargetScore(Number(e.target.value))}
          className="accent-[var(--primary)]"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        disabled={saving}
        onClick={() => void save()}
        className="rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {saving ? "Сохраняем..." : "Сохранить"}
      </button>
    </div>
  );
}