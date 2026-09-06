"use client";

import { collectSubgroupOptions } from "@/lib/filterLessons";
import {
  NOT_MINE,
  type Catalog,
  type Lesson,
  type Settings,
} from "@/lib/types";
import SwipeSheet from "./SwipeSheet";

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

export default function SettingsSheet({
  settings,
  lessons,
  catalog,
  catalogError,
  updatedAt,
  onChange,
  onClose,
}: {
  settings: Settings;
  lessons: Lesson[];
  catalog: Catalog | null;
  catalogError: boolean;
  updatedAt?: string | null;
  onChange: (next: Settings) => void;
  onClose: () => void;
}) {
  const courses = catalog?.courses ?? [];
  const groups =
    courses.find((entry) => entry.course === settings.course)?.groups ?? [];
  const subgroupOptions = collectSubgroupOptions(lessons);

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

  return (
    <SwipeSheet title="Настройки" onClose={onClose}>
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

      {updatedAt && (
        <p className="mt-4 border-t border-[var(--color-line)] pt-3 text-center text-[12px] text-[var(--color-muted)]">
          Обновлено на сайте: {updatedAt}
        </p>
      )}
    </SwipeSheet>
  );
}
