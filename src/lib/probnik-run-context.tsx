"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

import { apiGetAuth, apiPostAuth } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { parseProbnikTime } from "@/lib/probnik-constants";
import type {
  ProbnikAnswerPayload,
  ProbnikReviewResponse,
  ProbnikStartPayload,
  ProbnikStartResponse,
  ProbnikTask,
  SelfGradeResponse,
} from "@/lib/api";

interface AnswerSlot {
  selectedIndex: number | null;
  answerText: string;
}

type RunState =
  | { phase: "idle" }
  | {
      phase: "active";
      sessionId: string;
      subjectName: string;
      tasks: ProbnikTask[];
      currentIndex: number;
      selectedIndex: number | null;
      answerText: string;
      answeredIndices: Set<number>;
      flaggedIndices: Set<number>;
      answers: Record<number, AnswerSlot>;
      deadline: number;
      durationSeconds: number;
    }
  | { phase: "finishing"; sessionId: string; subjectName: string }
  | {
      phase: "review";
      sessionId: string;
      review: ProbnikReviewResponse;
      currentIndex: number;
      gradeDraft: Record<number, string>;
      elapsedSeconds: number;
    };

interface ProbnikRunContextValue {
  state: RunState;
  start: (payload: ProbnikStartPayload, durationLabel: string) => Promise<void>;
  pickOption: (index: number) => void;
  setAnswerText: (text: string) => void;
  submitAnswer: () => Promise<void>;
  goNext: () => Promise<void>;
  jumpTo: (index: number) => void;
  toggleFlag: (index: number) => void;
  forceFinish: () => Promise<void>;
  jumpReview: (index: number) => void;
  setGradeDraft: (taskId: number, value: string) => void;
  submitSelfGrade: (taskId: number, points: number) => Promise<void>;
  reset: () => void;
  hint: string | null;
}

const ProbnikRunContext = createContext<ProbnikRunContextValue | null>(null);

export function ProbnikRunProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  const [state, setState] = useState<RunState>({ phase: "idle" });
  const [hint, setHintState] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHint = useCallback((text: string) => {
    setHintState(text);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintState(null), 3000);
  }, []);

  const finishSession = useCallback(
    async (sessionId: string, subjectName: string, elapsedSeconds: number) => {
      if (auth.status !== "confirmed") return;
      setState({ phase: "finishing", sessionId, subjectName });
      try {
        await apiPostAuth(`/api/probnik/${sessionId}/finish`, auth.token);
        const review = await apiGetAuth<ProbnikReviewResponse>(`/api/probnik/${sessionId}/review`, auth.token);
        setState({ phase: "review", sessionId, review, currentIndex: 0, gradeDraft: {}, elapsedSeconds });
      } catch (err) {
        console.error("[probnik] не удалось завершить пробник:", err);
        showHint("Не удалось подвести итог пробника — проверьте соединение");
      }
    },
    [auth, showHint]
  );

  const start = useCallback(
    async (payload: ProbnikStartPayload, durationLabel: string) => {
      if (auth.status !== "confirmed") return;
      try {
        const data = await apiPostAuth<ProbnikStartResponse>("/api/probnik/start", auth.token, payload);
        const durationSeconds = parseProbnikTime(durationLabel);
        setState({
          phase: "active",
          sessionId: data.session_id,
          subjectName: data.subject_name,
          tasks: data.tasks,
          currentIndex: 0,
          selectedIndex: null,
          answerText: "",
          answeredIndices: new Set(),
          flaggedIndices: new Set(),
          answers: {},
          deadline: Date.now() + durationSeconds * 1000,
          durationSeconds,
        });
      } catch (err) {
        console.error("[probnik] не удалось запустить пробник:", err);
        showHint("Не удалось начать пробник — проверьте соединение и попробуйте ещё раз");
        throw err;
      }
    },
    [auth, showHint]
  );

  const pickOption = useCallback((index: number) => {
    setState((prev) => (prev.phase === "active" ? { ...prev, selectedIndex: index } : prev));
  }, []);

  const setAnswerText = useCallback((text: string) => {
    setState((prev) => (prev.phase === "active" ? { ...prev, answerText: text } : prev));
  }, []);

  const submitAnswer = useCallback(async () => {
    if (state.phase !== "active" || auth.status !== "confirmed") return;
    const task = state.tasks[state.currentIndex];
    const payload: ProbnikAnswerPayload = { task_id: task.id };
    if (task.task_type === "mcq") {
      if (state.selectedIndex === null) {
        showHint("Сначала выберите один из вариантов ответа");
        return;
      }
      payload.selected_index = state.selectedIndex;
    } else {
      if (!state.answerText.trim()) {
        showHint("Введите ответ перед отправкой");
        return;
      }
      payload.answer_text = state.answerText;
    }

    try {
      await apiPostAuth(`/api/probnik/${state.sessionId}/answer`, auth.token, payload);
      setState((prev) => {
        if (prev.phase !== "active") return prev;
        const nextAnswered = new Set(prev.answeredIndices);
        nextAnswered.add(prev.currentIndex);
        return {
          ...prev,
          answeredIndices: nextAnswered,
          answers: {
            ...prev.answers,
            [prev.currentIndex]: { selectedIndex: prev.selectedIndex, answerText: prev.answerText },
          },
        };
      });
    } catch (err) {
      console.error("[probnik] не удалось отправить ответ:", err);
      showHint("Не удалось отправить ответ — проверьте соединение и попробуйте ещё раз");
    }
  }, [state, auth, showHint]);

  const goToIndex = useCallback((prev: Extract<RunState, { phase: "active" }>, index: number): RunState => {
    const slot = prev.answers[index];
    return {
      ...prev,
      currentIndex: index,
      selectedIndex: slot ? slot.selectedIndex : null,
      answerText: slot ? slot.answerText : "",
    };
  }, []);

  const elapsedFor = useCallback((prev: Extract<RunState, { phase: "active" }>): number => {
    const remaining = Math.max(0, Math.round((prev.deadline - Date.now()) / 1000));
    return Math.max(0, prev.durationSeconds - remaining);
  }, []);

  const goNext = useCallback(async () => {
    if (state.phase !== "active") return;
    const currentTask = state.tasks[state.currentIndex];
    let markedState = state;
    if (currentTask.part === 2) {
      const nextAnswered = new Set(state.answeredIndices);
      nextAnswered.add(state.currentIndex);
      markedState = { ...state, answeredIndices: nextAnswered };
      setState(markedState);
    }
    const nextIndex = state.currentIndex + 1;
    if (nextIndex >= state.tasks.length) {
      await finishSession(state.sessionId, state.subjectName, elapsedFor(markedState));
    } else {
      setState((prev) => (prev.phase === "active" ? goToIndex(prev, nextIndex) : prev));
    }
  }, [state, finishSession, goToIndex, elapsedFor]);

  const jumpTo = useCallback(
    (index: number) => {
      setState((prev) => {
        if (prev.phase !== "active") return prev;
        if (index < 0 || index >= prev.tasks.length) return prev;
        return goToIndex(prev, index);
      });
    },
    [goToIndex]
  );

  /** Клиентская пометка "на пересмотр" — без бэкенда, живёт только на время
   * текущей сессии прохождения (в отличие от answeredIndices не влияет на
   * подсчёт баллов, чисто навигационная подсказка себе). */
  const toggleFlag = useCallback((index: number) => {
    setState((prev) => {
      if (prev.phase !== "active") return prev;
      const next = new Set(prev.flaggedIndices);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { ...prev, flaggedIndices: next };
    });
  }, []);

  const forceFinish = useCallback(async () => {
    if (state.phase !== "active") return;
    await finishSession(state.sessionId, state.subjectName, elapsedFor(state));
  }, [state, finishSession, elapsedFor]);

  const jumpReview = useCallback((index: number) => {
    setState((prev) => {
      if (prev.phase !== "review") return prev;
      if (index < 0 || index >= prev.review.tasks.length) return prev;
      return { ...prev, currentIndex: index };
    });
  }, []);

  const setGradeDraft = useCallback((taskId: number, value: string) => {
    setState((prev) =>
      prev.phase === "review" ? { ...prev, gradeDraft: { ...prev.gradeDraft, [taskId]: value } } : prev
    );
  }, []);

  const submitSelfGrade = useCallback(
    async (taskId: number, points: number) => {
      if (state.phase !== "review" || auth.status !== "confirmed") return;
      try {
        const result = await apiPostAuth<SelfGradeResponse>(
          `/api/probnik/${state.sessionId}/self-grade`,
          auth.token,
          { task_id: taskId, points }
        );
        setState((prev) => {
          if (prev.phase !== "review") return prev;
          const tasks = prev.review.tasks.map((t: (typeof prev.review.tasks)[number]) =>
            t.id === taskId ? { ...t, self_graded_points: result.points } : t
          );
          return {
            ...prev,
            review: {
              ...prev.review,
              tasks,
              total_points: result.total_points,
              earned_points: result.earned_points,
              percent: result.percent,
              secondary_score: result.secondary_score,
              math_basic_grade: result.math_basic_grade,
            },
          };
        });
      } catch (err) {
        console.error("[probnik] не удалось сохранить баллы:", err);
        showHint("Не удалось сохранить баллы — проверьте соединение");
      }
    },
    [state, auth, showHint]
  );

  const reset = useCallback(() => {
    setState({ phase: "idle" });
  }, []);

  const value: ProbnikRunContextValue = {
    state,
    start,
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
  };

  return <ProbnikRunContext.Provider value={value}>{children}</ProbnikRunContext.Provider>;
}

export function useProbnikRun() {
  const ctx = useContext(ProbnikRunContext);
  if (!ctx) throw new Error("useProbnikRun должен использоваться внутри <ProbnikRunProvider>");
  return ctx;
}
