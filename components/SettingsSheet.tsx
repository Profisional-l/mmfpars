"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { collectSubgroupOptions } from "@/lib/filterLessons";
import {
  NOT_MINE,
  type Catalog,
  type Lesson,
  type Settings,
} from "@/lib/types";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-accent)]"
      }`}
    >
      {children}
    </button>
  );
}

const DISMISS_PX = 110;

export default function SettingsSheet({
  settings,
  lessons,
  catalog,
  catalogError,
  onChange,
  onClose,
}: {
  settings: Settings;
  lessons: Lesson[];
  catalog: Catalog | null;
  catalogError: boolean;
  onChange: (next: Settings) => void;
  onClose: () => void;
}) {
  const courses = catalog?.courses ?? [];
  const groups =
    courses.find((entry) => entry.course === settings.course)?.groups ?? [];
  const subgroupOptions = collectSubgroupOptions(lessons);

  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startTs = useRef(0);
  const baseOffset = useRef(0);
  const active = useRef(false);
  const armed = useRef(false); // ждём направление жеста из верха списка

  const [offset, setOffset] = useState(0);
  const [opened, setOpened] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpened(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, []);

  const finishClose = useCallback(() => {
    setClosing(true);
    setDragging(false);
    active.current = false;
    armed.current = false;
    setOffset((sheetRef.current?.getBoundingClientRect().height ?? 520) + 24);
    window.setTimeout(onClose, 260);
  }, [onClose]);

  const beginDrag = (clientY: number) => {
    if (closing) return;
    active.current = true;
    armed.current = false;
    setDragging(true);
    startY.current = clientY;
    startTs.current = performance.now();
    baseOffset.current = offset;
  };

  const moveDrag = (clientY: number) => {
    if (armed.current && !active.current) {
      const dy = clientY - startY.current;
      if (dy > 8) beginDrag(startY.current); // потянули вниз → сворачиваем
      else if (dy < -8) armed.current = false; // скролл вверх по контенту
      else return;
    }
    if (!active.current) return;
    const dy = clientY - startY.current;
    setOffset(Math.max(0, baseOffset.current + dy));
  };

  const endDrag = () => {
    armed.current = false;
    if (!active.current) return;
    active.current = false;
    setDragging(false);

    const elapsed = Math.max(1, performance.now() - startTs.current);
    const velocity = offset / elapsed;
    if (offset > DISMISS_PX || velocity > 0.65) finishClose();
    else setOffset(0);
  };

  const onHandlePointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    beginDrag(event.clientY);
  };

  const onScrollPointerDown = (event: React.PointerEvent) => {
    if ((scrollRef.current?.scrollTop ?? 0) > 0) return;
    armed.current = true;
    startY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const selectCourse = (course: number) => {
    const nextGroups =
      courses.find((entry) => entry.course === course)?.groups ?? [];
    const nextGroup = nextGroups.some((group) => group.slug === settings.group)
      ? settings.group
      : (nextGroups[0]?.slug ?? settings.group);
    onChange({ ...settings, course, group: nextGroup, subgroups: {} });
  };

  const selectGroup = (group: string) => {
    onChange({ ...settings, group, subgroups: {} });
  };

  const selectSubgroup = (subject: string, value: string) => {
    const subgroups = { ...settings.subgroups };
    if (subgroups[subject] === value) delete subgroups[subject];
    else subgroups[subject] = value;
    onChange({ ...settings, subgroups });
  };

  const sheetY = !opened
    ? "100%"
    : closing
      ? `${offset}px`
      : `${offset}px`;
  const backdropOpacity = !opened || closing ? 0 : Math.max(0, 1 - offset / 280);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Закрыть настройки"
        className="absolute inset-0 bg-black/50 transition-opacity duration-200"
        style={{ opacity: backdropOpacity }}
        onClick={finishClose}
      />

      <div
        ref={sheetRef}
        className="relative mx-auto flex w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl border border-b-0 border-[var(--color-line)] bg-[var(--color-canvas)] shadow-[0_-8px_40px_rgba(0,0,0,0.25)] sm:max-w-xl"
        style={{
          maxHeight: "min(92vh, 920px)",
          transform: `translate3d(0, ${sheetY}, 0)`,
          transition: dragging
            ? "none"
            : "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onPointerMove={(event) => moveDrag(event.clientY)}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          ref={scrollRef}
          className="sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
          onPointerDown={onScrollPointerDown}
          onPointerMove={(event) => {
            if (!active.current) return;
            if (offset > 0) event.preventDefault();
            moveDrag(event.clientY);
          }}
        >
          <div
            className="sticky top-0 z-10 flex touch-none cursor-grab flex-col items-center justify-center gap-1.5 px-4 py-2.5 active:cursor-grabbing"
            style={{
              background:
                "color-mix(in srgb, var(--color-canvas) 28%, transparent)",
              backdropFilter: "blur(24px) saturate(1.4)",
              WebkitBackdropFilter: "blur(24px) saturate(1.4)",
            }}
            onPointerDown={onHandlePointerDown}
          >
            <span className="h-1 w-9 rounded-full bg-[var(--color-muted)]/50" />
            <h2 className="text-[15px] font-semibold leading-none">Настройки</h2>
          </div>

          <div className="px-4 pb-4">
          <section className="mb-4">
            <h3 className="mb-2 text-[13px] font-medium text-[var(--color-muted)]">
              Курс
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(courses.length > 0
                ? courses.map((entry) => entry.course)
                : [settings.course]
              ).map((course) => (
                <Chip
                  key={course}
                  active={course === settings.course}
                  onClick={() => selectCourse(course)}
                >
                  {course} курс
                </Chip>
              ))}
            </div>
          </section>

          <section className="mb-4">
            <h3 className="mb-2 text-[13px] font-medium text-[var(--color-muted)]">
              Группа
            </h3>
            {groups.length === 0 ? (
              <p className="text-[13px] text-[var(--color-muted)]">
                {catalogError
                  ? "Не удалось загрузить список групп"
                  : "Загружаем список групп…"}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {groups.map((group) => (
                  <Chip
                    key={group.slug}
                    active={group.slug === settings.group}
                    onClick={() => selectGroup(group.slug)}
                  >
                    {group.title.replace(" группа", "")}
                  </Chip>
                ))}
              </div>
            )}
          </section>

          <section className="mb-4">
            <h3 className="mb-2 text-[13px] font-medium text-[var(--color-muted)]">
              Тема
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                active={settings.theme === "dark"}
                onClick={() => onChange({ ...settings, theme: "dark" })}
              >
                тёмная
              </Chip>
              <Chip
                active={settings.theme === "light"}
                onClick={() => onChange({ ...settings, theme: "light" })}
              >
                светлая
              </Chip>
            </div>
          </section>

          <section className="mb-4">
            <h3 className="mb-2 text-[13px] font-medium text-[var(--color-muted)]">
              Недели
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                active={!settings.showAllWeeks}
                onClick={() => onChange({ ...settings, showAllWeeks: false })}
              >
                эта неделя
              </Chip>
              <Chip
                active={settings.showAllWeeks}
                onClick={() => onChange({ ...settings, showAllWeeks: true })}
              >
                все недели
              </Chip>
            </div>
          </section>

          {subgroupOptions.length > 0 && (
            <section>
              <h3 className="mb-1 text-[13px] font-medium text-[var(--color-muted)]">
                Мои подгруппы
              </h3>
              <p className="mb-3 text-[12px] text-[var(--color-muted)]">
                Выбор отдельный для каждого предмета — деление на парах разное.
              </p>
              <div className="flex flex-col gap-3">
                {subgroupOptions.map(({ subject, options }) => (
                  <div key={subject}>
                    <p className="mb-1.5 text-[13px] break-words">{subject}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {options.map((option) => (
                        <Chip
                          key={option}
                          active={settings.subgroups[subject] === option}
                          onClick={() => selectSubgroup(subject, option)}
                        >
                          {option}
                        </Chip>
                      ))}
                      <Chip
                        active={settings.subgroups[subject] === NOT_MINE}
                        onClick={() => selectSubgroup(subject, NOT_MINE)}
                      >
                        не моё
                      </Chip>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
