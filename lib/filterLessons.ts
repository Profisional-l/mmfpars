import { NOT_MINE, type Lesson, type SubgroupChoices } from "./types";

/** Варианты подгрупп по каждому предмету — из них собирается экран настроек. */
export function collectSubgroupOptions(
  lessons: Lesson[],
): { subject: string; options: string[] }[] {
  const bySubject = new Map<string, Set<string>>();

  for (const lesson of lessons) {
    if (lesson.subgroups.length === 0) continue;
    const set = bySubject.get(lesson.subject) ?? new Set<string>();
    for (const subgroup of lesson.subgroups) set.add(subgroup);
    bySubject.set(lesson.subject, set);
  }

  return [...bySubject.entries()]
    .map(([subject, options]) => ({
      subject,
      options: [...options].sort((a, b) => a.localeCompare(b, "ru")),
    }))
    .filter((entry) => entry.options.length > 0)
    .sort((a, b) => a.subject.localeCompare(b.subject, "ru"));
}

export function matchesSubgroup(
  lesson: Lesson,
  choices: SubgroupChoices,
): boolean {
  const choice = choices[lesson.subject];
  if (choice === NOT_MINE) return false;
  // пара для всей группы либо подгруппа ещё не выбрана — показываем
  if (lesson.subgroups.length === 0 || !choice) return true;
  return lesson.subgroups.includes(choice);
}

export function matchesWeek(
  lesson: Lesson,
  week: 1 | 2,
  showAllWeeks: boolean,
): boolean {
  if (showAllWeeks || lesson.week === null) return true;
  return lesson.week === week;
}

/** Пары с датами показываем только в те дни, когда они действительно есть. */
export function matchesDate(lesson: Lesson, date: string): boolean {
  if (lesson.datesOnly && lesson.datesOnly.length > 0) {
    return lesson.datesOnly.includes(date);
  }
  if (lesson.datesExcept?.includes(date)) return false;
  if (lesson.dateFrom && date < lesson.dateFrom) return false;
  if (lesson.dateTo && date > lesson.dateTo) return false;
  return true;
}

export function visibleLessons(
  lessons: Lesson[],
  options: {
    date: string;
    week: 1 | 2;
    showAllWeeks: boolean;
    choices: SubgroupChoices;
  },
): Lesson[] {
  return lessons.filter(
    (lesson) =>
      matchesSubgroup(lesson, options.choices) &&
      matchesWeek(lesson, options.week, options.showAllWeeks) &&
      matchesDate(lesson, options.date),
  );
}
