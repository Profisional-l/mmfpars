"use client";

import { useMemo } from "react";
import LessonCard from "./LessonCard";
import SwipeSheet from "./SwipeSheet";
import { visibleLessons } from "@/lib/filterLessons";
import {
  dateOfDayFromMonday,
  nextDisplayWeekMonday,
  weekForDate,
} from "@/lib/week";
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

export default function NextWeekSheet({
  lessons,
  today,
  choices,
  showAllWeeks,
  onClose,
}: {
  lessons: Lesson[];
  today: string;
  choices: SubgroupChoices;
  showAllWeeks: boolean;
  onClose: () => void;
}) {
  const monday = nextDisplayWeekMonday(today);
  const week = weekForDate(monday);
  const saturday = dateOfDayFromMonday(monday, "saturday");

  const lessonsByDay = useMemo(() => {
    const map = new Map<DayId, Lesson[]>();
    for (const lesson of lessons) {
      const dayLessons = map.get(lesson.day) ?? [];
      dayLessons.push(lesson);
      map.set(lesson.day, dayLessons);
    }
    return map;
  }, [lessons]);

  const rangeLabel = `${formatDate(monday)} – ${formatDate(saturday)}`;

  return (
    <SwipeSheet title={`${week}-я неделя`} onClose={onClose}>
      <p className="mb-3 text-center text-[12px] text-[var(--color-muted)]">
        {rangeLabel}
      </p>

      <div className="flex flex-col gap-3">
        {DAY_ORDER.map((day) => {
          const date = dateOfDayFromMonday(monday, day);
          const dayLessons = visibleLessons(lessonsByDay.get(day) ?? [], {
            date,
            week,
            showAllWeeks,
            choices,
          });

          return (
            <section
              key={day}
              className="rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-canvas)] p-3"
            >
              <header className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1">
                <h3 className="text-[15px] font-semibold">{DAY_LABELS[day]}</h3>
                <span className="text-[12px] text-[var(--color-muted)]">
                  {formatDate(date)}
                </span>
              </header>

              {dayLessons.length === 0 ? (
                <p className="px-1 pb-1 text-[13px] text-[var(--color-muted)]">
                  пар нет
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {dayLessons.map((lesson) => (
                    <LessonCard key={lesson.id} lesson={lesson} isNow={false} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </SwipeSheet>
  );
}
