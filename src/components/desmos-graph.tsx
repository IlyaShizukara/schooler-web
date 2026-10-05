"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

import { cn } from "@/lib/utils";

// Desmos Graphing Calculator API — грузится один раз на страницу (тег
// <script>, не npm-пакет, см. https://www.desmos.com/api/v1.11/docs/index.html).
// Ключ — NEXT_PUBLIC_DESMOS_API_KEY, получить на desmos.com/my-api
// (для коммерческого использования — desmos.com/partners, см. заметку в
// паспорте проекта, точная граница "что считается коммерческим" ещё не
// уточнена).

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (element: HTMLElement, options?: Record<string, unknown>) => DesmosCalculatorInstance;
    };
  }
}

interface DesmosCalculatorInstance {
  setExpression: (expr: { id: string; latex: string }) => void;
  resize: () => void;
  destroy: () => void;
}

// Промис загрузки скрипта — общий на всю страницу, чтобы при нескольких
// графиках в одном чате (или в разных сообщениях) не вставлять <script>
// повторно и не дёргать несколько параллельных загрузок.
let desmosLoadPromise: Promise<void> | null = null;

function loadDesmosScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Desmos) return Promise.resolve();
  if (desmosLoadPromise) return desmosLoadPromise;

  desmosLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-desmos-loader]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("desmos script failed")));
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_DESMOS_API_KEY ?? "";
    const script = document.createElement("script");
    script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${apiKey}`;
    script.async = true;
    script.dataset.desmosLoader = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("desmos script failed"));
    document.head.appendChild(script);
  });

  return desmosLoadPromise;
}

export function DesmosGraph({ expressions }: { expressions: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<DesmosCalculatorInstance | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  // Маленький график в чате по умолчанию — не разрывает пузырёк сообщения;
  // "развернуть" открывает тот же контейнер (не пересоздавая калькулятор)
  // поверх всего экрана для детального разглядывания.
  const [isExpanded, setIsExpanded] = useState(false);
  const idPrefix = useId();

  // Ключ эффекта — не сам массив (он новый на каждый ре-рендер родителя,
  // т.к. parseGraphMarkers пересоздаёт объекты), а его содержимое. Иначе
  // калькулятор пересоздавался бы на каждый ре-рендер чата.
  const expressionsKey = expressions.join(";");

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_DESMOS_API_KEY) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    loadDesmosScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.Desmos) return;
        const calculator = window.Desmos.GraphingCalculator(containerRef.current, {
          keypad: false,
          expressionsCollapsed: true,
          settingsMenu: false,
          zoomButtons: true,
          border: false,
        });
        calculatorRef.current = calculator;
        expressionsKey.split(";").forEach((latex, i) => {
          calculator.setExpression({ id: `${idPrefix}-${i}`, latex });
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      calculatorRef.current?.destroy();
      calculatorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- expressionsKey уже отражает содержимое expressions
  }, [expressionsKey, idPrefix]);

  // Desmos сам не всегда успевает подхватить смену размера контейнера
  // через CSS-класс (fixed inset-0 при разворачивании) — просим его
  // пересчитаться явно, следующим тиком, после того как браузер применит
  // новые размеры.
  useEffect(() => {
    if (status !== "ready") return;
    const raf = requestAnimationFrame(() => calculatorRef.current?.resize());
    return () => cancelAnimationFrame(raf);
  }, [isExpanded, status]);

  // Esc закрывает развёрнутый график — обычная клавиатурная привычка для
  // полноэкранных оверлеев.
  useEffect(() => {
    if (!isExpanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsExpanded(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExpanded]);

  if (status === "error") {
    return (
      <p className="my-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
        Не удалось загрузить график.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "my-2",
        isExpanded && "fixed inset-0 z-50 flex flex-col gap-2 bg-background/95 p-4 backdrop-blur-sm"
      )}
    >
      {isExpanded && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">График</span>
          <button
            onClick={() => setIsExpanded(false)}
            className="rounded-lg border border-border bg-background/60 p-1.5 text-foreground hover:bg-background"
            aria-label="Свернуть график"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/60",
          isExpanded ? "flex-1" : "h-48 w-full"
        )}
      >
        <div ref={containerRef} className="h-full w-full" />

        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="absolute right-2 top-2 rounded-lg border border-border bg-background/80 p-1.5 text-foreground shadow-sm hover:bg-background"
            aria-label="Развернуть график"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}