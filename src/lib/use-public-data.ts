"use client";

import { useEffect, useState } from "react";

import { apiGet, apiGetAuth } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/**
 * Как useAuthedData (см. use-authed-data.ts — тот же кэш и дедупликация
 * запросов по ключу), но для эндпоинтов, которые отдают контент и без
 * входа: банк заданий, темы, next-task (см. content.py::get_current_user_optional).
 *
 * Единственное отличие от useAuthedData: там при token === null хук вообще
 * не идёт в сеть (это правильно для приватных путей вроде /api/profile —
 * незачем стучаться заведомо на 401). Здесь наоборот — идём в сеть ВСЕГДА:
 * с токеном через apiGetAuth (авторизованный получает персонализированный
 * ответ), без токена через обычный apiGet (гость получает тот же контент,
 * но без личной статистики — see backend guest-ветки).
 *
 * Ключ кэша — `${token ?? "guest"}::path`, поэтому вход через Telegram
 * (появление токена) не подмешивает гостевые данные — это просто другой
 * ключ, будет свежий запрос.
 */

interface CacheEntry<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  promise: Promise<void> | null;
  fetchedAt: number;
  listeners: Set<() => void>;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry<unknown>>();

function getEntry<T>(key: string): CacheEntry<T> {
  let entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    entry = { data: null, error: null, loading: false, promise: null, fetchedAt: 0, listeners: new Set() };
    cache.set(key, entry as CacheEntry<unknown>);
  }
  return entry;
}

function notify<T>(entry: CacheEntry<T>) {
  entry.listeners.forEach((listen) => listen());
}

function load<T>(key: string, path: string, token: string | null, force = false): Promise<void> {
  const entry = getEntry<T>(key);
  const isFresh = entry.fetchedAt > 0 && Date.now() - entry.fetchedAt < CACHE_TTL_MS;

  if (entry.promise) return entry.promise; // такой же запрос уже летит — не дублируем
  if (isFresh && !force) return Promise.resolve(); // данные свежие — сеть не трогаем

  entry.loading = true;
  notify(entry);

  const fetcher = token ? apiGetAuth<T>(path, token) : apiGet<T>(path);

  const promise = fetcher
    .then((res) => {
      entry.data = res;
      entry.error = null;
      entry.fetchedAt = Date.now();
    })
    .catch((err) => {
      entry.error = err;
    })
    .finally(() => {
      entry.loading = false;
      entry.promise = null;
      notify(entry);
    });

  entry.promise = promise;
  return promise;
}

export function usePublicData<T>(path: string) {
  const { auth } = useAuth();
  const token = auth.status === "confirmed" ? auth.token : null;
  const key = `${token ?? "guest"}::${path}`;

  const [, bump] = useState(0);

  useEffect(() => {
    const entry = getEntry<T>(key);
    const listener = () => bump((n) => n + 1);
    entry.listeners.add(listener);
    void load<T>(key, path, token);
    return () => {
      entry.listeners.delete(listener);
    };
  }, [key, path, token]);

  const entry = getEntry<T>(key);
  // loading=true показываем только пока данных нет вообще — как и в
  // useAuthedData, фоновое обновление по устаревшему TTL не должно
  // повторно рисовать скелетон.
  return { data: entry.data, loading: entry.loading && entry.data === null, error: entry.error };
}

/** Принудительно сбросить кэш по пути (следующий usePublicData перезапросит данные). */
export function invalidatePublicData(path: string, token?: string | null) {
  cache.delete(`${token ?? "guest"}::${path}`);
}
