"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

import { apiGetAuth, apiPost, apiPostAuth } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { parseProbnikTime } from "@/lib/probnik-constants";
import type {
  ProbnikAnswerPayload,
  ProbnikReviewResponse,
  ProbnikReviewTask,
  ProbnikStartPayload,
  ProbnikStartResponse,
  ProbnikTask,
  SelfGradeResponse,
} from "@/lib/api";

// ──────────────────────────────────────────────────────────────────────────
// Гостевые типы ответа — зеркалят ProbnikGuestStartOut/ProbnikGuestGradeOut
// из probnik.py. Не заведены в api.ts вместе с остальными Probnik*-типами
// только потому, что я не видел этот файл целиком при правке — стоит потом
// перенести туда для единообразия.
// ──────────────────────────────────────────────────────────────────────────
interface ProbnikGuestStartResponse {
  subject_slug: string;
  subject_name: string;
  tasks: ProbnikTask[];
  total_points: number;
}

interface ProbnikGuestGradeResponse {
  subject_name: string;
  tasks: ProbnikReviewTask[];
  total_points: number;
  earned_points: number;
  percent: number;
  note: string;
}

interface AnswerSlot {
  selectedIndex: number | null;
  answerText: string;
}

type RunState =
  | { phase: "idle" }
  | {
      phase: "active";
      isGuest: boolean;
      sessionId: string; // у гостя нет реальной сессии на бэкенде — placeholder "guest", нигде в сеть не уходит
      subjectSlug: string;
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
      isGuest: boolean;
      sessionId: string;
      review: ProbnikReviewResponse;
      currentIndex: number;
      gradeDraft: Record<number, string>;
      elapsedSeconds: number;
      /** Только у гостя — почему баллы неполные (часть 2 не учтена, ничего не сохранено). */
      note?: string;
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

type ActiveState = Extract<RunState, { phase: "active" }>;

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

  // Собирает пакет ответов для /guest/grade из ВСЕХ заданий пробника, а не
  // только отвеченных — иначе total_points на бэкенде посчитается только по
  // тому, что гость успел отправить, и досрочное завершение выглядело бы
  // как 100% вместо честного результата с недорешёнными = неверными.
  const buildGuestAnswers = useCallback((activeState: ActiveState) => {
    return activeState.tasks.map((t, idx) => {
      const slot = activeState.answers[idx];
      return {
        task_id: t.id,
        selected_index: slot?.selectedIndex ?? undefined,
        answer_text: slot?.answerText || undefined,
      };
    });
  }, []);

  const finishSession = useCallback(
    async (activeState: ActiveState, elapsedSeconds: number) => {
      const { sessionId, subjectName, subjectSlug, isGuest, tasks, answers } = activeState;
      setState({ phase: "finishing", sessionId, subjectName });
      try {
        if (isGuest) {
          const data = await apiPost<ProbnikGuestGradeResponse>("/api/probnik/guest/grade", {
            subject_slug: subjectSlug,
            answers: buildGuestAnswers(activeState),
          });
          const review: ProbnikReviewResponse = {
            subject_name: data.subject_name,
            tasks: data.tasks,
            total_points: data.total_points,
            earned_points: data.earned_points,
            percent: data.percent,
            secondary_score: null,
            math_basic_grade: null,
          };
          setState({
            phase: "review",
            isGuest: true,
            sessionId: "guest",
            review,
            currentIndex: 0,
            gradeDraft: {},
            elapsedSeconds,
            note: data.note,
          });
        } else {
          if (auth.status !== "confirmed") return;
          await apiPostAuth(`/api/probnik/${sessionId}/finish`, auth.token);
          const review = await apiGetAuth<ProbnikReviewResponse>(`/api/probnik/${sessionId}/review`, auth.token);
          setState({ phase: "review", isGuest: false, sessionId, review, currentIndex: 0, gradeDraft: {}, elapsedSeconds });
        }
      } catch (err) {
        console.error("[probnik] не удалось завершить пробник:", err);
        showHint("Не удалось подвести итог пробника — проверьте соединение");
      }
    },
    [auth, showHint, buildGuestAnswers]
  );

  const start = useCallback(
    async (payload: ProbnikStartPayload, durationLabel: string) => {
      const isGuest = auth.status !== "confirmed";
      const durationSeconds = parseProbnikTime(durationLabel);
      try {
        if (isGuest) {
          const data = await apiPost<ProbnikGuestStartResponse>("/api/probnik/guest/start", payload);
          setState({
            phase: "active",
            isGuest: true,
            sessionId: "guest",
            subjectSlug: data.subject_slug,
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
        } else {
          if (auth.status !== "confirmed") return;
          const data = await apiPostAuth<ProbnikStartResponse>("/api/probnik/start", auth.token, payload);
          setState({
            phase: "active",
            isGuest: false,
            sessionId: data.session_id,
            subjectSlug: payload.subject_slug,
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
        }
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
    if (state.phase !== "active") return;
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

    // У гостя нет сохранённой сессии на бэкенде — ответ по каждому вопросу
    // никуда не отправляется по ходу прохождения, только копится локально
    // (answers ниже) и уходит одним пакетом на /guest/grade в конце. Для
    // залогиненного поведение не изменилось: сохраняем сразу же.
    if (!state.isGuest) {
      if (auth.status !== "confirmed") return;
      try {
        await apiPostAuth(`/api/probnik/${state.sessionId}/answer`, auth.token, payload);
      } catch (err) {
        console.error("[probnik] не удалось отправить ответ:", err);
        showHint("Не удалось отправить ответ — проверьте соединение и попробуйте ещё раз");
        return;
      }
    }

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
  }, [state, auth, showHint]);

  const goToIndex = useCallback((prev: ActiveState, index: number): RunState => {
    const slot = prev.answers[index];
    return {
      ...prev,
      currentIndex: index,
      selectedIndex: slot ? slot.selectedIndex : null,
      answerText: slot ? slot.answerText : "",
    };
  }, []);

  const elapsedFor = useCallback((prev: ActiveState): number => {
    const remaining = Math.max(0, Math.round((prev.deadline - Date.now()) / 1000));
    return Math.max(0, prev.durationSeconds - remaining);
  }, []);

  const goNext = useCallback(async () => {
    if (state.phase !== "active") return;
    const currentTask = state.tasks[state.currentIndex];
    let markedState: ActiveState = state;
    if (currentTask.part === 2) {
      const nextAnswered = new Set(state.answeredIndices);
      nextAnswered.add(state.currentIndex);
      markedState = { ...state, answeredIndices: nextAnswered };
      setState(markedState);
    }
    const nextIndex = state.currentIndex + 1;
    if (nextIndex >= state.tasks.length) {
      await finishSession(markedState, elapsedFor(markedState));
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
    await finishSession(state, elapsedFor(state));
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
      if (state.phase !== "review") return;

      // Самооценка части 2 требует сохранённой сессии (ProbnikPart2Grade
      // в БД, привязанный к exam_session_id) — у гостя её нет и предложить
      // сохранить некуда, честно объясняем вместо тихого no-op.
      if (state.isGuest) {
        showHint("Самооценка части 2 доступна после входа через Telegram");
        return;
      }
      if (auth.status !== "confirmed") return;

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