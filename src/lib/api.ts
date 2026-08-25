// src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface ProbnikTask {
  id: number;
  task_number?: number | null;
  task_type: "mcq" | "short_answer";
  part: 1 | 2;
  question: string;
  options?: string[] | null;
  image_urls?: string[] | null;
  file_urls?: TaskFile[] | null;
  points: number;
}

export interface ProbnikStartPayload {
  subject_slug: string;
  parts: string[];
  topic_id?: number | null;
  task_count?: number | null;
}

export interface ProbnikStartResponse {
  session_id: string;
  subject_name: string;
  tasks: ProbnikTask[];
}

export interface ProbnikAnswerPayload {
  task_id: number;
  selected_index?: number;
  answer_text?: string;
}

export interface ProbnikReviewTask {
  id: number;
  task_number?: number | null;
  part: 1 | 2;
  question: string;
  image_urls?: string[] | null;
  file_urls?: TaskFile[] | null;
  task_type: "mcq" | "short_answer";
  options?: string[] | null;
  answered: boolean;
  selected_index?: number | null;
  answer_text?: string | null;
  is_correct?: boolean;
  correct_index?: number | null;
  correct_answer_text?: string | null;
  explanation?: string | null;
  criteria?: string | null;
  points: number;
  self_graded_points?: number | null;
}

export interface ProbnikReviewResponse {
  subject_name: string;
  tasks: ProbnikReviewTask[];
  total_points: number;
  earned_points: number;
  percent: number;
  secondary_score?: number | null;
  math_basic_grade?: number | string | null;
}

export interface SelfGradeResponse {
  points: number;
  total_points: number;
  earned_points: number;
  percent: number;
  secondary_score?: number | null;
  math_basic_grade?: number | string | null;
}

export interface HeatmapItem {
  date: string;
  count: number;
}

export interface TopicItem {
  topic_id: number | null;
  name: string;
  solved: number;
  total: number;
  accuracy: number;
  percent: number;
  total_points?: number;
  difficulty?: "лёгкое" | "среднее" | "сложное" | null;
  task_number?: number | null;
  task_number_to?: number | null;
}

export interface TaskFile {
  name: string;
  url: string;
}

export interface TaskResponse {
  id: number;
  task_type: "mcq" | "short_answer";
  part: 1 | 2;
  question: string;
  options?: string[] | null;
  image_urls?: string[] | null;
  file_urls?: TaskFile[] | null;
  points: number;
  topic?: string | null;
  explanation?: string | null;
}

export interface AnswerResult {
  is_correct: boolean;
  correct_index?: number | null;
  correct_answer_text?: string | null;
  explanation?: string | null;
}

export interface OnboardingPayload {
  display_name: string;
  exam_type: "ЕГЭ" | "ОГЭ";
  grade: number;
  subject_slugs: string[];
  exam_date: string | null;
  daily_goal: number;
  target_score: number;
}

export interface ProbnikHistoryItem {
  subject_name: string;
  correct_count: number;
  total_tasks: number;
}

export interface SubjectSummaryItem {
  slug: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  solved: number;
  total: number;
  accuracy: number;
  percent: number;
  total_points?: number;
}

export interface WeakSpotItem {
  subject_name: string;
  percent: number;
  color: string;
}

export interface ProgressSummaryResponse {
  total_solved: number;
  accuracy: number;
  probniks_count: number;
  weekly_activity: { day: string; count: number }[];
  weak_spots: WeakSpotItem[];
  by_subject: SubjectSummaryItem[];
}

export interface XpSummaryResponse {
  xp: number;
  level: number;
  xp_for_next_level: number;
  current_streak: number;
  longest_streak: number;
}

export interface ProfileResponse {
  display_name: string | null;
  exam_type: "ЕГЭ" | "ОГЭ" | null;
  grade: number | null;
  subject_slugs: string[];
  exam_date: string | null;
  daily_goal: number;
  target_score: number;
  onboarding_completed: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.detail ?? data.message ?? message;
    } catch {
      // тело не JSON — оставляем statusText
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiGetAuth<T>(path: string, token: string): Promise<T> {
  return request<T>(path, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function apiPostAuth<T>(path: string, token: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ---- Типы под auth-context.tsx ----

export interface AuthStartResponse {
  code: string;
  deep_link: string;
}

export interface SessionStatusResponse {
  status: "pending" | "confirmed" | "expired";
  session_token?: string;
  name?: string | null;
}