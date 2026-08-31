import {
  DEFAULT_SETTINGS,
  type Catalog,
  type Schedule,
  type Settings,
} from "./types";

import { SETTINGS_STORAGE_KEY } from "./theme";

const SETTINGS_KEY = SETTINGS_STORAGE_KEY;
const CACHE_PREFIX = "mmf-schedule-cache:";
const CATALOG_KEY = "mmf-schedule-catalog";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      course: Number(parsed.course) || DEFAULT_SETTINGS.course,
      group: parsed.group || DEFAULT_SETTINGS.group,
      subgroups: parsed.subgroups ?? {},
      showAllWeeks: Boolean(parsed.showAllWeeks),
      theme: parsed.theme === "light" ? "light" : DEFAULT_SETTINGS.theme,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // приватный режим — работаем без сохранения
  }
}

/** Последний удачный ответ, чтобы расписание открывалось и без сети. */
export function cacheSchedule(schedule: Schedule): void {
  try {
    window.localStorage.setItem(
      `${CACHE_PREFIX}${schedule.course}:${schedule.group}`,
      JSON.stringify(schedule),
    );
  } catch {
    // переполнение хранилища не должно ломать экран
  }
}

export function readCachedSchedule(
  course: number,
  group: string,
): Schedule | null {
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${course}:${group}`);
    return raw ? (JSON.parse(raw) as Schedule) : null;
  } catch {
    return null;
  }
}

export function cacheCatalog(catalog: Catalog): void {
  try {
    window.localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  } catch {
    // не критично: список групп подгрузится с сервера
  }
}

export function readCachedCatalog(): Catalog | null {
  try {
    const raw = window.localStorage.getItem(CATALOG_KEY);
    return raw ? (JSON.parse(raw) as Catalog) : null;
  } catch {
    return null;
  }
}
