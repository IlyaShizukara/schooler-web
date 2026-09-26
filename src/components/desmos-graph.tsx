"use client";

import { useEffect, useId, useRef, useState } from "react";

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

  if (status === "error") {
    return (
      <p className="my-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
        Не удалось загрузить график.
      </p>
    );
  }

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border/60">
      <div ref={containerRef} className="h-64 w-full" />
    </div>
  );
}