"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Download, Eye, Info, Paperclip, SkipForward, XCircle } from "lucide-react";

import { GuestBanner } from "@/components/guest-banner";
import { MathContent } from "@/components/math-content";
import { useAuth } from "@/lib/auth-context";
import { usePublicData } from "@/lib/use-public-data";
import { apiGet, apiGetAuth, apiPost, apiPostAuth } from "@/lib/api";
import { proxiedMediaUrl } from "@/lib/math-content";
import type { AnswerResult, SubjectSummaryItem, TaskResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

const primaryButtonClass =
  "flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-sm font-semibold text-primary-foreground shadow-[0_4px_20px_rgba(108,37,255,0.25)] transition-all hover:shadow-[0_10px_30px_rgba(108,37,255,0.35)] dark:shadow-[0_0_15px_rgba(108,37,255,0.4)] disabled:opacity-60 disabled:shadow-none";

function SolveSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="glass-panel animate-pulse rounded-2xl p-6">
        <div className="mb-4 flex gap-2">
          <div className="h-6 w-20 rounded-full bg-surface-2" />
          <div className="h-6 w-16 rounded-full bg-surface-2" />
        </div>
        <div className="h-32 rounded-lg bg-surface-2" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-2" />
      ))}
    </div>
  );
}

export default function SolveTaskPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic"); // null = без фильтра (все темы)

  const { auth } = useAuth();
  const confirmed = auth.status === "confirmed";

  // Банк заданий открыт и гостю — usePublicData всегда идёт в сеть.
  const { data: subjects } = usePublicData<SubjectSummaryItem[]>("/api/subjects");
  const subjectName = subjects?.find((s) => s.slug === params.slug)?.name ?? params.slug;

  const [task, setTask] = useState<TaskResponse | null>(null);
  const [taskLoading, setTaskLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchNextTask() {
    // Раньше здесь был ранний return для гостя — next-task теперь открыт
    // всем (см. content.py::next_task, get_current_user_optional), гость
    // просто не получает исключение "уже решённых" заданий из выборки.
    setTaskLoading(true);
    setTask(null);
    setSelectedIndex(null);
    setAnswerText("");
    setResult(null);
    setRevealed(false);
    setHint(null);

    const path = `/api/subjects/${params.slug}/next-task${topicParam !== null ? `?topic_id=${topicParam}` : ""}`;
    try {
      const data =
        auth.status === "confirmed"
          ? await apiGetAuth<TaskResponse>(path, auth.token)
          : await apiGet<TaskResponse>(path);
      setTask(data);
    } catch (err) {
      console.error("[solve] не удалось получить задание:", err);
    } finally {
      setTaskLoading(false);
    }
  }

  useEffect(() => {
    void fetchNextTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status, params.slug, topicParam]);

  function showHint(text: string) {
    setHint(text);
    window.setTimeout(() => setHint((h) => (h === text ? null : h)), 3000);
  }

  async function submitAnswer() {
    if (!task) return;
    const payload: { selected_index?: number; answer_text?: string } = {};
    if (task.task_type === "mcq") {
      if (selectedIndex === null) {
        showHint("Сначала выберите один из вариантов ответа");
        return;
      }
      payload.selected_index = selectedIndex;
    } else {
      if (!answerText.trim()) {
        showHint("Введите ответ перед отправкой");
        return;
      }
      payload.answer_text = answerText;
    }

    setSubmitting(true);
    try {
      // Гость тоже получает проверку ответа (см. content.py::submit_answer) —
      // просто ничего не сохраняется на бэкенде (нет Attempt, нет XP).
      const data =
        auth.status === "confirmed"
          ? await apiPostAuth<AnswerResult>(`/api/tasks/${task.id}/answer`, auth.token, payload)
          : await apiPost<AnswerResult>(`/api/tasks/${task.id}/answer`, payload);
      setResult(data);
    } catch (err) {
      console.error("[solve] не удалось отправить ответ:", err);
      showHint("Не удалось отправить ответ — проверьте соединение и попробуйте ещё раз");
    } finally {
      setSubmitting(false);
    }
  }

  const header = (
    <div className="flex items-center gap-2">
      <Link
        href={`/subjects/${params.slug}`}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-lg font-bold">{subjectName}</h1>
    </div>
  );

  if (taskLoading || task === null) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <SolveSkeleton />
      </div>
    );
  }

  const currentTask: TaskResponse = task;
  const isPartTwo = currentTask.part === 2;
  const imageUrls: string[] = currentTask.image_urls ?? [];
  const fileUrls: { name: string; url: string }[] = currentTask.file_urls ?? [];
  const options: string[] = currentTask.options ?? [];

  return (
    <div className="flex flex-col gap-6">
      {header}

      {!confirmed && (
        <GuestBanner message="Ответ проверяется как обычно, но результат нигде не сохранится." />
      )}

      <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
        <div className="relative mb-4 flex flex-wrap gap-2">
          {isPartTwo && (
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: "color-mix(in srgb, var(--warning) 15%, transparent)", color: "var(--warning)" }}
            >
              Часть 2 · развёрнутый ответ
            </span>
          )}
          {currentTask.topic && (
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{currentTask.topic}</span>
          )}
          <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs text-muted-foreground">
            {currentTask.points} балл(ов)
          </span>
        </div>

        <MathContent text={currentTask.question} className="relative text-lg leading-relaxed" />

        {imageUrls.map((url) => (
          <div key={url} className="relative mt-4 flex justify-center rounded-xl border border-border/60 bg-white p-3">
            <img src={proxiedMediaUrl(url)} alt="" className="max-h-[400px] rounded-lg object-contain" />
          </div>
        ))}

        {fileUrls.map((f) => (
          <a
            key={f.url}
            href={proxiedMediaUrl(f.url)}
            target="_blank"
            rel="noreferrer"
            className="relative mt-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3.5 py-3 text-sm transition-colors hover:bg-border"
          >
            <Paperclip className="h-4 w-4 text-primary" />
            <span className="font-medium">{f.name || "Файл"}</span>
            <Download className="ml-auto h-4 w-4 text-muted-foreground" />
          </a>
        ))}
      </div>

      {hint && (
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          {hint}
        </div>
      )}

      {isPartTwo ? (
        !revealed ? (
          <button onClick={() => setRevealed(true)} className={primaryButtonClass}>
            <Eye className="h-4 w-4" />
            Показать ответ
          </button>
        ) : (
          <>
            <div className="glass-panel relative overflow-hidden rounded-2xl border border-primary/30 p-5">
              <div className="relative mb-2 flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-bold">Эталон / критерии</span>
              </div>
              {currentTask.explanation ? (
                <MathContent text={currentTask.explanation} className="relative text-base leading-relaxed" />
              ) : (
                <p className="relative text-sm text-muted-foreground">Эталон для этого задания пока не добавлен.</p>
              )}
            </div>
            <button onClick={() => void fetchNextTask()} className={primaryButtonClass}>
              Следующее задание
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )
      ) : result === null ? (
        <>
          {currentTask.task_type === "mcq" ? (
            <div className="flex flex-col gap-2.5">
              {options.map((opt, idx) => {
                const selected = selectedIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 text-left text-base transition-all",
                      selected
                        ? "border-primary bg-primary/10 shadow-[0_4px_14px_rgba(108,37,255,0.15)] dark:shadow-[0_0_15px_rgba(108,37,255,0.4)]"
                        : "border-border bg-surface hover:border-primary/40 hover:bg-surface-2"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-colors",
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
          ) : (
            <input
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submitAnswer()}
              placeholder="Ваш ответ"
              className="rounded-xl border border-border bg-surface px-4 py-3.5 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          )}

          <div className="flex gap-3">
            <button disabled={submitting} onClick={() => void submitAnswer()} className={cn(primaryButtonClass, "flex-1")}>
              Ответить
            </button>
            <button
              onClick={() => void fetchNextTask()}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
            >
              Пропустить
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            className="rounded-2xl border p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-none"
            style={{
              backgroundColor: `color-mix(in srgb, ${result.is_correct ? "var(--success)" : "var(--destructive)"} 10%, transparent)`,
              borderColor: `color-mix(in srgb, ${result.is_correct ? "var(--success)" : "var(--destructive)"} 35%, transparent)`,
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              {result.is_correct ? (
                <CheckCircle2 className="h-5 w-5" style={{ color: "var(--success)" }} />
              ) : (
                <XCircle className="h-5 w-5" style={{ color: "var(--destructive)" }} />
              )}
              <span className="text-base font-bold" style={{ color: result.is_correct ? "var(--success)" : "var(--destructive)" }}>
                {result.is_correct ? "Верно!" : "Неверно"}
              </span>
            </div>
            {!result.is_correct && (
              <p className="mb-2 text-sm text-muted-foreground">
                Правильный ответ:{" "}
                {result.correct_answer_text ??
                  (result.correct_index != null ? options[result.correct_index] : null) ??
                  "—"}
              </p>
            )}
            {result.explanation && <MathContent text={result.explanation} className="text-base leading-relaxed" />}
          </div>
          <button onClick={() => void fetchNextTask()} className={primaryButtonClass}>
            Следующее задание
            <ArrowRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}