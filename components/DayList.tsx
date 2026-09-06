"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LessonCard from "./LessonCard";
import NextWeekSheet from "./NextWeekSheet";
import { visibleLessons } from "@/lib/filterLessons";
import {
  dateOfDayInWeek,
  displayWeek,
  timeToMinutes,
  type MinskNow,
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
  const tomorrowRef = useRef<HTMLElement | null>(null);
  const [awayFromToday, setAwayFromToday] = useState(false);
  const [nextWeekOpen, setNextWeekOpen] = useState(false);

  // сб → «завтра» в списке нет (вс без пар); вс → пн
  const tomorrow = DAY_ORDER[(now.weekdayIndex + 1) % 7] ?? null;
  const week = displayWeek(now.date);

  const targetEl = () => todayRef.current ?? tomorrowRef.current;

  const scrollToToday = useCallback((behavior: ScrollBehavior = "smooth") => {
    targetEl()?.scrollIntoView({ block: "start", behavior });
  }, []);

  useEffect(() => {
    scrollToToday("instant");
  }, [now.date, scrollToToday]);

  useEffect(() => {
    const update = () => {
      const el = targetEl();
      if (!el) {
        setAwayFromToday(false);
        return;
      }
      const rect = el.getBoundingClientRect();
      // «на месте», если день примерно под шапкой
      const near = rect.top >= 40 && rect.top <= 160;
      setAwayFromToday(!near);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [now.date, lessons]);

  const lessonsByDay = useMemo(() => {
    const map = new Map<DayId, Lesson[]>();
    for (const lesson of lessons) {
      const dayLessons = map.get(lesson.day) ?? [];
      dayLessons.push(lesson);
      map.set(lesson.day, dayLessons);
    }
    return map;
  }, [lessons]);

  const fabLabel = now.day ? "К сегодня" : "К понедельнику";

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DAY_ORDER.map((day) => {
          const date = dateOfDayInWeek(now.date, day);
          const dayLessons = visibleLessons(lessonsByDay.get(day) ?? [], {
            date,
            week,
            showAllWeeks,
            choices,
          });

          const isToday = day === now.day;
          const isTomorrow = day === tomorrow;

          return (
            <section
              key={day}
              ref={isToday ? todayRef : isTomorrow ? tomorrowRef : undefined}
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

      <div className="mt-5 mb-2 flex justify-center">
        <button
          type="button"
          onClick={() => setNextWeekOpen(true)}
          className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-[13px] text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)]"
        >
          Следующая неделя
        </button>
      </div>

      {nextWeekOpen && (
        <NextWeekSheet
          lessons={lessons}
          today={now.date}
          choices={choices}
          showAllWeeks={showAllWeeks}
          onClose={() => setNextWeekOpen(false)}
        />
      )}

      <button
        type="button"
        aria-label={fabLabel}
        title={fabLabel}
        onClick={() => scrollToToday("smooth")}
        className={`fixed right-4 z-10 flex size-9 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)]/90 shadow-[0_6px_18px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all duration-200 bottom-[max(1rem,env(safe-area-inset-bottom))] ${
          awayFromToday
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <span className="size-4 rounded-full bg-[var(--color-accent)]" />
      </button>
    </>
  );
}
