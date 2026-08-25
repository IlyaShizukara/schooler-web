"use client";

import { useEffect, useState } from "react";

import { apiGetAuth } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/**
 * Общий клиентский кэш для useAuthedData.
 *
 * Раньше каждый вызов useAuthedData(path) — а их на одну страницу могло
 * приходиться 3-4 штуки на один и тот же path (Sidebar + AppShell + сама
 * страница) — независимо стучался в сеть. Из-за этого при каждой навигации
 * улетало по несколько одинаковых запросов к бэкенду на Amvera, и именно
 * это (а не серверный рендер Next.js, который в логах быстрый) создавало
 * ощущение медленной загрузки в браузере.
 *
 * Теперь запросы дедуплицируются по ключу `token::path`: если такой запрос
 * уже летит — все подписчики ждут один и тот же промис; если данные уже
 * есть и не устарели (TTL) — сеть вообще не трогаем.
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

function load<T>(key: string, path: string, token: string, force = false): Promise<void> {
  const entry = getEntry<T>(key);
  const isFresh = entry.fetchedAt > 0 && Date.now() - entry.fetchedAt < CACHE_TTL_MS;

  if (entry.promise) return entry.promise; // такой же запрос уже летит — не дублируем
  if (isFresh && !force) return Promise.resolve(); // данные свежие — сеть не трогаем

  entry.loading = true;
  notify(entry);

  const promise = apiGetAuth<T>(path, token)
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

export function useAuthedData<T>(path: string) {
  const { auth } = useAuth();
  const token = auth.status === "confirmed" ? auth.token : null;
  const key = token ? `${token}::${path}` : null;

  const [, bump] = useState(0);

  useEffect(() => {
    if (!key || !token) return;
    const entry = getEntry<T>(key);
    const listener = () => bump((n) => n + 1);
    entry.listeners.add(listener);
    void load<T>(key, path, token);
    return () => {
      entry.listeners.delete(listener);
    };
  }, [key, path, token]);

  if (!key || !token) {
    return { data: null, loading: false, error: null };
  }

  const entry = getEntry<T>(key);
  // loading=true показываем только пока данных нет вообще — фоновое
  // обновление по устаревшему TTL не должно повторно рисовать скелетон
  return { data: entry.data, loading: entry.loading && entry.data === null, error: entry.error };
}

/** Принудительно сбросить кэш по пути (следующий useAuthedData перезапросит данные). */
export function invalidateAuthedData(path: string, token?: string | null) {
  if (token) {
    cache.delete(`${token}::${path}`);
    return;
  }
  for (const k of Array.from(cache.keys())) {
    if (k.endsWith(`::${path}`)) cache.delete(k);
  }
}

/** Оптимистично подменить закэшированные данные без похода в сеть (например, сразу после успешного сохранения формы). */
export function mutateAuthedData<T>(path: string, token: string, next: T) {
  const key = `${token}::${path}`;
  const entry = getEntry<T>(key);
  entry.data = next;
  entry.error = null;
  entry.fetchedAt = Date.now();
  notify(entry);
}
