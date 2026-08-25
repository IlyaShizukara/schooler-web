"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements: HTMLElement[]) => Promise<void>;
      chtml?: {
        scale?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
  }
}

let mathJaxLoadPromise: Promise<void> | null = null;

function loadMathJax(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MathJax) return Promise.resolve();
  if (mathJaxLoadPromise) return mathJaxLoadPromise;

  // Конфиг нужно выставить ДО загрузки tex-chtml.js — MathJax при старте
  // подхватывает и дополняет этот объект. Без него формулы рендерятся по
  // дефолту 1:1 к font-size контейнера, а внутри длинных формул дроби/
  // степени/индексы становятся совсем мелкими (обычная TeX-типографика).
  // scale задаёт единый множитель размера для ВСЕХ формул — и инлайн
  // ($...$), и блочных ($$...$$) — независимо от их длины и вложенности.
  window.MathJax = {
    chtml: {
      scale: 3,
    },
  };

  mathJaxLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Не удалось загрузить MathJax"));
    document.head.appendChild(script);
  });
  return mathJaxLoadPromise;
}

export function useMathJaxTypeset(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadMathJax().then(() => {
      if (cancelled || !ref.current) return;
      window.MathJax?.typesetPromise?.([ref.current]).catch((err) =>
        console.error("[mathjax] ошибка typeset:", err)
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
