"use client";

import { useEffect, useMemo, useRef } from "react";
import LessonCard from "./LessonCard";
import { visibleLessons } from "@/lib/filterLessons";
import { dateOfDayInWeek, timeToMinutes, type MinskNow } from "@/lib/week";
import {
  DAY_LABELS,
  DAY_ORDER,
  type DayId,
  type Lesson,
  type SubgroupChoices,
} from "@/lib/types";

const SHORT_DATE = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function formatDate(isoDate: string): string {
  return SHORT_DATE.format(new Date(`${isoDate}T00:00:00Z`));
}

export default function DayList({
  lessons,
  now,
  choices,
  showAllWeeks,
}: {
  lessons: Lesson[];
  now: MinskNow;
  choices: SubgroupChoices;
  showAllWeeks: boolean;
}) {
  const todayRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [now.date]);

  const tomorrow = DAY_ORDER[(now.weekdayIndex + 1) % 7] ?? null;

  const lessonsByDay = useMemo(() => {
    const map = new Map<DayId, Lesson[]>();
    for (const lesson of lessons) {
      const dayLessons = map.get(lesson.day) ?? [];
      dayLessons.push(lesson);
      map.set(lesson.day, dayLessons);
    }
    return map;
  }, [lessons]);

  return (
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
      {DAY_ORDER.map((day) => {
        const date = dateOfDayInWeek(now.date, day);
        const dayLessons = visibleLessons(lessonsByDay.get(day) ?? [], {
          date,
          week: now.week,
          showAllWeeks,
          choices,
        });

        const isToday = day === now.day;
        const isTomorrow = day === tomorrow;

        return (
          <section
            key={day}
            ref={isToday ? todayRef : undefined}
            className={`scroll-mt-28 rounded-3xl border p-3 ${
              isToday
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                : isTomorrow
                  ? "border-[var(--color-line)] bg-[var(--color-surface)]"
                  : "border-[var(--color-line)] bg-[var(--color-canvas)]"
            }`}
          >
            <header className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1">
              <h2 className="text-[15px] font-semibold">{DAY_LABELS[day]}</h2>
              <span className="text-[12px] text-[var(--color-muted)]">
                {formatDate(date)}
              </span>
              {isToday && (
                <span className="text-[12px] font-medium text-[var(--color-accent)]">
                  сегодня
                </span>
              )}
              {isTomorrow && (
                <span className="text-[12px] text-[var(--color-muted)]">
                  завтра
                </span>
              )}
            </header>

            {dayLessons.length === 0 ? (
              <p className="px-1 pb-1 text-[13px] text-[var(--color-muted)]">
                пар нет
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {dayLessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    isNow={
                      isToday &&
                      now.minutes >= timeToMinutes(lesson.start) &&
                      now.minutes <= timeToMinutes(lesson.end)
                    }
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
