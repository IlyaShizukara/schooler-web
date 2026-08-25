"use client";

import { AlertTriangle, Medal } from "lucide-react";

import { GuestPrompt } from "@/components/guest-prompt";
import { useAuth } from "@/lib/auth-context";
import { useAuthedData } from "@/lib/use-authed-data";
import type { ProgressSummaryResponse, SubjectSummaryItem } from "@/lib/api";

function ProgressSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-40 animate-pulse rounded-xl bg-card" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl bg-card md:col-span-2" />
        <div className="h-64 animate-pulse rounded-xl bg-card" />
      </div>
    </div>
  );
}

/** Строит ломаную линию по реальным точкам недельной активности —
 * не декоративная кривая, честно отражает форму реальных данных. */
function buildLinePath(counts: number[], width: number, height: number, padding = 20): { line: string; area: string; points: { x: number; y: number }[] } {
  const max = Math.max(...counts, 1);
  const step = (width - padding * 2) / Math.max(counts.length - 1, 1);
  const points = counts.map((c, i) => ({
    x: padding + i * step,
    y: height - padding - (c / max) * (height - padding * 2),
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  return { line, area, points };
}

export default function ProgressPage() {
  const { auth } = useAuth();
  const confirmed = auth.status === "confirmed";

  const { data: progress, loading: progressLoading } = useAuthedData<ProgressSummaryResponse>("/api/progress/summary");
  const { data: subjects, loading: subjectsLoading } = useAuthedData<SubjectSummaryItem[]>("/api/subjects");

  if (!confirmed) {
    return (
      <div className="pt-4">
        <GuestPrompt message="Войдите через Telegram, чтобы видеть свою статистику." />
      </div>
    );
  }

  if (progressLoading || subjectsLoading || !progress || !subjects) {
    return <ProgressSkeleton />;
  }

  const weekly = progress.weekly_activity;
  const chartW = 800;
  const chartH = 200;
  const { line, area, points } = buildLinePath(
    weekly.map((p) => p.count),
    chartW,
    chartH
  );

  const attemptedSubjects = subjects.filter((s) => s.solved > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* ---- баннер: реальная точность, без выдуманного прогноза готовности ---- */}
      <section className="relative overflow-hidden rounded-xl bg-primary p-8 text-primary-foreground shadow-[0px_8px_30px_rgba(108,37,255,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.2),_transparent_60%)]" />
        <div className="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <h1 className="mb-2 text-3xl font-extrabold md:text-4xl">Твоя средняя точность</h1>
            <p className="text-white/80">
              Решено {progress.total_solved.toLocaleString("ru-RU")} заданий · {progress.probniks_count} пробников
            </p>
          </div>
          <div className="flex items-baseline">
            <span className="font-mono-stat text-6xl font-semibold">{progress.accuracy}</span>
            <span className="ml-1 text-2xl font-bold text-white/80">%</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* ---- график активности за неделю (реальные точки) ---- */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold">Активность за неделю</h3>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-primary">Решено заданий</span>
          </div>
          <div className="relative h-52 w-full">
            <svg className="h-full w-full" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
              <line x1="0" x2={chartW} y1={chartH * 0.25} y2={chartH * 0.25} className="stroke-border" strokeDasharray="4" strokeWidth="1" />
              <line x1="0" x2={chartW} y1={chartH * 0.5} y2={chartH * 0.5} className="stroke-border" strokeDasharray="4" strokeWidth="1" />
              <line x1="0" x2={chartW} y1={chartH * 0.75} y2={chartH * 0.75} className="stroke-border" strokeDasharray="4" strokeWidth="1" />
              <defs>
                <linearGradient id="progressChartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#progressChartGradient)" opacity={0.25} />
              <path d={line} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="5" className="fill-card" stroke="var(--primary)" strokeWidth="2" />
              ))}
            </svg>
            <div className="mt-2 flex justify-between text-xs font-semibold text-muted-foreground">
              {weekly.map((p) => (
                <span key={p.day}>{p.day}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ---- слабые места (реальные данные) ---- */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Слабые места
          </h3>
          <div className="flex-1 space-y-4">
            {progress.weak_spots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока недостаточно попыток, чтобы выделить слабые места.</p>
            ) : (
              progress.weak_spots.map((w) => (
                <div key={w.subject_name} className="rounded-lg border border-destructive/15 bg-destructive/5 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{w.subject_name}</h4>
                    <span className="text-xs font-bold text-destructive">{w.percent}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-destructive" style={{ width: `${w.percent}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ⚠️ Система достижений на бэкенде не реализована — честная заглушка */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-1">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold">
            <Medal className="h-5 w-5 text-warning" />
            Достижения
          </h3>
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Medal className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Скоро здесь появятся значки за успехи в подготовке.</p>
          </div>
        </div>

        {/* ---- таблица по предметам (реальные данные, без выдуманного тренда) ---- */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="border-b border-border p-6">
            <h3 className="text-lg font-bold">Успеваемость по предметам</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="p-4">Предмет</th>
                  <th className="p-4">Решено</th>
                  <th className="p-4">Точность</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attemptedSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-sm text-muted-foreground">
                      Пока нет решённых заданий.
                    </td>
                  </tr>
                ) : (
                  attemptedSubjects.map((s) => (
                    <tr key={s.slug} className="transition-colors hover:bg-surface">
                      <td className="flex items-center gap-2 p-4 font-medium">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color ?? "var(--primary)" }} />
                        {s.name}
                      </td>
                      <td className="font-mono-stat p-4 text-muted-foreground">
                        {s.solved} / {s.total}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-stat text-sm">{s.accuracy}%</span>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${s.accuracy}%`, backgroundColor: "var(--success)" }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
