"use client";

import { useState } from "react";

type CheckResult = {
  title: string;
  success: boolean;
  message: string;
};

const PATH = "/ru/raspisanie-zanyatij/dnevnoe-otdelenie/3-kurs/8-gruppa/";

async function checkDevice(origin: string): Promise<CheckResult> {
  const title = `Напрямую с устройства: ${origin}`;
  try {
    // Обычный GET без специальных заголовков: не требует preflight.
    // Успешное чтение HTML одновременно подтверждает разрешение CORS.
    const response = await fetch(`${origin}${PATH}`, {
      mode: "cors",
      credentials: "omit",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return { title, success: false, message: `Сайт ответил HTTP ${response.status}.` };
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const rows = doc.querySelectorAll(".content-area table td.subject-teachers").length;
    const embedded = [...doc.querySelectorAll<HTMLIFrameElement>(".content-area iframe[src]")]
      .some(frame => frame.src.startsWith("https://docs.google.com/spreadsheets/d/e/"));
    return {
      title,
      success: rows > 0,
      message: rows > 0
        ? `Браузер смог прочитать расписание (${rows} строк). Прямая загрузка с устройства возможна.`
        : embedded
          ? "Страница ММФ прочитана. Расписание встроено из Google-таблицы; её загрузку проверяет тест через сервер."
          : "Ответ прочитан, но таблица расписания не найдена. Возможно, это другая страница или изменённая разметка.",
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return {
      title,
      success: false,
      message: name === "TimeoutError"
        ? "Нет ответа за 15 секунд."
        : "Браузер не разрешил прочитать ответ или не смог соединиться с сайтом. По одному этому результату нельзя отличить CORS от сетевого сбоя; точная причина видна в консоли браузера.",
    };
  }
}

async function checkServer(): Promise<CheckResult> {
  const title = "Через сервер Vercel";
  try {
    const response = await fetch("/api/schedule?course=3&group=8-gruppa&fresh=1", {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const region = response.headers.get("x-mmf-region") ?? "не указан";
    const data = await response.json();
    return {
      title,
      success: response.ok && Array.isArray(data.lessons) && data.lessons.length > 0,
      message: response.ok
        ? `Регион: ${region}. Загружено ${data.lessons?.length ?? 0} занятий.`
        : `Регион: ${region}. HTTP ${response.status}. ${data.error ?? "Ошибка загрузки."}`,
    };
  } catch {
    return { title, success: false, message: "Не удалось получить ответ API приложения." };
  }
}

export default function DiagnosticsPage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);

  const run = async () => {
    setRunning(true);
    setResults([]);
    try {
      await Promise.all([
        checkServer(),
        checkDevice("https://mmf.bsu.by"),
        checkDevice("https://www.mmf.bsu.by"),
      ].map(async (task) => {
        const result = await task;
        setResults((current) => [...current, result]);
      }));
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <a href="/" className="text-sm text-[var(--color-muted)] underline">К расписанию</a>
      <h1 className="mt-6 text-xl font-semibold">Проверка загрузки</h1>
      <p className="mt-3 text-sm text-[var(--color-muted)]">
        Открой эту страницу без VPN, в сети, где сайт мехмата работает. Проверка сравнит загрузку через Vercel с прямым чтением страницы из браузера телефона.
      </p>
      <button type="button" disabled={running} onClick={run} className="mt-5 rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm text-[var(--color-accent-contrast)] disabled:opacity-50">
        {running ? "Проверяем…" : "Проверить"}
      </button>
      <div className="mt-5 space-y-3" aria-live="polite">
        {results.map((result) => (
          <section key={result.title} className="rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <h2 className="break-words text-sm font-semibold">{result.title}</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{result.success ? "Успешно. " : ""}{result.message}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
