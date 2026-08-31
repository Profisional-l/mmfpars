export type DayId =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export const DAY_ORDER: DayId[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const DAY_LABELS: Record<DayId, string> = {
  monday: "Понедельник",
  tuesday: "Вторник",
  wednesday: "Среда",
  thursday: "Четверг",
  friday: "Пятница",
  saturday: "Суббота",
};

export type LessonType = "lecture" | "practice" | "lab" | "other";

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  lecture: "лекц",
  practice: "практ",
  lab: "лаб",
  other: "",
};

export type Lesson = {
  id: string;
  day: DayId;
  start: string;
  end: string;
  subject: string;
  teacher: string;
  type: LessonType;
  room: string;
  /** 1 = 1н, 2 = 2н, null = каждую неделю */
  week: 1 | 2 | null;
  /** пусто = пара для всей группы */
  subgroups: string[];
  notes: string;
  dateFrom?: string;
  dateTo?: string;
  datesOnly?: string[];
  datesExcept?: string[];
};

export type Schedule = {
  course: number;
  group: string;
  groupTitle: string;
  speciality: string;
  updatedAt: string;
  sourceUrl: string;
  lessons: Lesson[];
};

export type GroupRef = {
  slug: string;
  title: string;
  speciality: string;
};

export type CourseRef = {
  course: number;
  groups: GroupRef[];
};

export type Catalog = {
  courses: CourseRef[];
};

/** subject -> выбранная подгруппа ("" = ещё не выбрано, NOT_MINE = скрыть предмет) */
export type SubgroupChoices = Record<string, string>;

export const NOT_MINE = "__not_mine__";

export type Theme = "dark" | "light";

export type Settings = {
  course: number;
  group: string;
  subgroups: SubgroupChoices;
  showAllWeeks: boolean;
  theme: Theme;
};

export const DEFAULT_SETTINGS: Settings = {
  course: 3,
  group: "8-gruppa",
  subgroups: {},
  showAllWeeks: false,
  theme: "dark",
};
