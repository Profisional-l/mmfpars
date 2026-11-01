"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DayList from "@/components/DayList";
import SettingsSheet from "@/components/SettingsSheet";
import { minskNow, displayWeek, type MinskNow } from "@/lib/week";
import { applyTheme } from "@/lib/theme";
import {
  cacheCatalog,
  cacheSchedule,
  loadSettings,
  readCachedCatalog,
  readCachedSchedule,
  saveSettings,
} from "@/lib/storage";
import {
  DEFAULT_SETTINGS,
  type Catalog,
  type Schedule,
  type Settings,
} from "@/lib/types";

export default function HomePage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState<MinskNow | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const saved = loadSettings();
    setSettings(saved);
    applyTheme(saved.theme);
    setCatalog(readCachedCatalog());
    setNow(minskNow());
    setReady(true);

    const timer = window.setInterval(() => setNow(minskNow()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    fetch("/api/catalog")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: Catalog) => {
        if (!active) return;
        setCatalog(data);
        cacheCatalog(data);
      })
      .catch(() => {
        if (active) setCatalogError(true);
      });

    return () => {
      active = false;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    let active = true;
    setLoading(true);
    setError(null);

    const cached = readCachedSchedule(settings.course, settings.group);
    setSchedule(cached);

    fetch(`/api/schedule?course=${settings.course}&group=${settings.group}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error ?? "Ошибка загрузки");
        return data as Schedule;
      })
      .then((data) => {
        if (!active) return;
        setSchedule(data);
        cacheSchedule(data);
      })
      .catch((cause: Error) => {
        if (!active) return;
        if (!cached) setSchedule(null);
        setError(
          cached
            ? `Не удалось обновить расписание — показываем сохранённую копию. ${cause.message}`
            : cause.message,
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ready, settings.course, settings.group, reloadCount]);

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
    applyTheme(next.theme);
  }, []);

  const lessons = useMemo(() => schedule?.lessons ?? [], [schedule]);
  const numbered = settings.group.match(/^(\d+)-gruppa$/);
  const groupLabel = numbered
    ? `${numbered[1]} группа`
    : settings.group === "vf"
      ? "ВФ"
      : settings.group;

  return (
    <>
      <div className="pwa-status-blur" aria-hidden />

      <main className="app-shell mx-auto flex w-full max-w-[480px] flex-col px-3 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-4 md:max-w-3xl xl:max-w-6xl">
        <header className="app-header sticky z-10 -mx-3 mb-3 border-b border-[var(--color-line)] bg-[var(--color-canvas)] px-3 pb-3 sm:-mx-4 sm:px-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold sm:text-base">
                {settings.course} курс · {groupLabel}
              </h1>
              <p className="truncate text-[12px] text-[var(--color-muted)] sm:text-[13px]">
                {now ? `${displayWeek(now.date)}-я неделя` : "…"}
                {settings.showAllWeeks ? " · показаны все недели" : ""}
                {schedule?.speciality ? ` · ${schedule.speciality}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="shrink-0 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-[13px] transition-colors hover:border-[var(--color-accent)]"
            >
              Настройки
            </button>
          </div>
        </header>

        {error && (
          <p className="mb-3 rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-[13px] text-[var(--color-muted)]">
            {error}
            <button type="button" disabled={loading} onClick={() => setReloadCount((value) => value + 1)} className="ml-2 underline disabled:opacity-50">
              {loading ? "Обновляем…" : "Повторить"}
            </button>
          </p>
        )}

        {loading && !schedule && (
          <p className="p-3 text-[13px] text-[var(--color-muted)]">
            Загружаем расписание…
          </p>
        )}

        {now && schedule && (
          <DayList
            lessons={lessons}
            now={now}
            choices={settings.subgroups}
            showAllWeeks={settings.showAllWeeks}
          />
        )}

        {settingsOpen && (
          <SettingsSheet
            settings={settings}
            lessons={lessons}
            catalog={catalog}
            catalogError={catalogError}
            updatedAt={schedule?.updatedAt ?? null}
            onChange={updateSettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </main>
    </>
  );
}
