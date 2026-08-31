import { DAY_ORDER, type DayId } from "./types";

/**
 * Понедельник первой (1н) недели текущего семестра.
 * Обновлять в начале каждого учебного года / семестра.
 */
export const SEMESTER_START = "2026-08-31";

const TIME_ZONE = "Europe/Minsk";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export type MinskNow = {
  /** YYYY-MM-DD */
  date: string;
  /** минуты от начала суток */
  minutes: number;
  /** 0 = понедельник ... 6 = воскресенье */
  weekdayIndex: number;
  day: DayId | null;
  week: 1 | 2;
};

function dayNumber(isoDate: string): number {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
}

export function weekForDate(isoDate: string, semesterStart = SEMESTER_START): 1 | 2 {
  const diff = dayNumber(isoDate) - dayNumber(semesterStart);
  const weeks = Math.floor(diff / 7);
  // корректный остаток и для дат до начала семестра
  return (((weeks % 2) + 2) % 2 === 0 ? 1 : 2) as 1 | 2;
}

export function weekdayIndexOf(isoDate: string): number {
  // 1970-01-01 — четверг (индекс 3 при отсчёте от понедельника)
  return (((dayNumber(isoDate) + 3) % 7) + 7) % 7;
}

export function addDays(isoDate: string, days: number): string {
  const ms = Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function minskNow(now: Date = new Date()): MinskNow {
  const parts = partsFormatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  const weekdayIndex = weekdayIndexOf(date);

  return {
    date,
    minutes: hour * 60 + minute,
    weekdayIndex,
    day: DAY_ORDER[weekdayIndex] ?? null,
    week: weekForDate(date),
  };
}

/** Дата (YYYY-MM-DD) ближайшего указанного дня недели, начиная с today. */
export function dateOfDayInWeek(today: string, day: DayId): string {
  const target = DAY_ORDER.indexOf(day);
  const current = weekdayIndexOf(today);
  return addDays(today, target - current);
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}
