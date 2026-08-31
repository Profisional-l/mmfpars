import * as cheerio from "cheerio";
import { SEMESTER_START } from "./week";
import {
  DAY_ORDER,
  DAY_LABELS,
  type DayId,
  type Lesson,
  type LessonType,
  type Schedule,
} from "./types";

const TEACHER_TITLES =
  /(?:ст\.?\s?преп\.?|доц\.?|проф\.?|асс\.?|преп\.?|акад\.?|чл\.?-корр\.?)/i;

const DAY_BY_LABEL: Record<string, DayId> = Object.fromEntries(
  DAY_ORDER.map((day) => [DAY_LABELS[day].toLowerCase(), day]),
) as Record<string, DayId>;

function clean(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseDay(text: string): DayId | null {
  return DAY_BY_LABEL[clean(text).toLowerCase()] ?? null;
}

/** «13:00–14:20» и старый формат «8:05–8:45–8:50–9:30» → границы пары. */
export function parseTime(text: string): { start: string; end: string } | null {
  const times = clean(text).match(/\d{1,2}:\d{2}/g);
  if (!times || times.length === 0) return null;

  const pad = (value: string) => value.padStart(5, "0");
  return { start: pad(times[0]), end: pad(times[times.length - 1]) };
}

/** «1н/А», «А,Б», «2н», «а», «1гр.» → неделя + список подгрупп. */
export function parseRemarks(text: string): {
  week: 1 | 2 | null;
  subgroups: string[];
} {
  const value = clean(text);
  if (!value) return { week: null, subgroups: [] };

  let week: 1 | 2 | null = null;
  const subgroups: string[] = [];

  for (const chunk of value.split("/")) {
    for (const token of chunk.split(",")) {
      const item = token.trim().replace(/\.$/, "");
      if (!item) continue;

      const weekMatch = item.match(/^([12])\s?н$/i);
      if (weekMatch) {
        week = Number(weekMatch[1]) as 1 | 2;
        continue;
      }

      if (!subgroups.includes(item)) subgroups.push(item);
    }
  }

  return { week, subgroups };
}

function parseType(text: string): LessonType {
  const value = clean(text).toLowerCase();
  if (!value) return "other";
  if (value.startsWith("лекц")) return "lecture";
  if (value.startsWith("практ")) return "practice";
  if (value.startsWith("лаб")) return "lab";
  return "other";
}

function isTeacherLine(line: string): boolean {
  if (TEACHER_TITLES.test(line)) return true;
  // «Карпович И.Н.», «Lu Yongtao» — без должности
  return /^[A-ZА-ЯЁ][^,()]*\s(?:[A-ZА-ЯЁ]\.\s?[A-ZА-ЯЁ]?\.?|[A-Z][a-z]+)$/.test(
    line,
  );
}

/** Учебный год: сентябрь–декабрь остаются в году начала семестра, январь–август переходят в следующий. */
export function resolveDate(
  day: number,
  month: number,
  semesterStart = SEMESTER_START,
): string {
  const [startYear, startMonth] = semesterStart.split("-").map(Number);
  const year = month >= startMonth ? startYear : startYear + 1;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

function datesIn(text: string, semesterStart: string): string[] {
  const matches = text.match(/\b(\d{1,2})\.(\d{1,2})\b/g) ?? [];
  return matches.map((match) => {
    const [day, month] = match.split(".").map(Number);
    return resolveDate(day, month, semesterStart);
  });
}

/**
 * Из заметок вида «(с 29.09)», «(до 18.11)», «(кроме 04.04, 18.04)», «01.09»
 * достаём период действия пары.
 */
export function parseNoteDates(
  notes: string,
  semesterStart = SEMESTER_START,
): Pick<Lesson, "dateFrom" | "dateTo" | "datesOnly" | "datesExcept"> {
  const result: Pick<
    Lesson,
    "dateFrom" | "dateTo" | "datesOnly" | "datesExcept"
  > = {};
  const value = clean(notes);
  if (!value) return result;

  const from = value.match(/(?<!\p{L})с\s+(\d{1,2})\.(\d{1,2})/iu);
  if (from) result.dateFrom = resolveDate(+from[1], +from[2], semesterStart);

  const to = value.match(/(?<!\p{L})до\s+(\d{1,2})\.(\d{1,2})/iu);
  if (to) result.dateTo = resolveDate(+to[1], +to[2], semesterStart);

  const except = value.match(/(?<!\p{L})кроме(?!\p{L})([^)]*)/iu);
  if (except) {
    const dates = datesIn(except[1], semesterStart);
    if (dates.length > 0) result.datesExcept = dates;
  }

  if (!result.dateFrom && !result.dateTo && !result.datesExcept) {
    // «01.09», «25.03 отработка за 11.03» — разовые занятия,
    // дата отработки («за …») к дню проведения не относится
    const head = value.split(/(?<!\p{L})за(?!\p{L})/iu)[0];
    const dates = datesIn(head, semesterStart);
    if (dates.length > 0 && !/\d{1,2}-\d{2}-\d{1,2}-\d{2}/.test(value)) {
      result.datesOnly = dates;
    }
  }

  return result;
}

function cellText($: cheerio.CheerioAPI, row: cheerio.Cheerio<never>, className: string, fallbackIndex: number) {
  const byClass = row.find(`td.${className}`);
  const cell = byClass.length > 0 ? byClass.first() : row.find("td").eq(fallbackIndex);
  return cell;
}

export function splitSubjectCell(html: string): {
  subject: string;
  teacher: string;
  notes: string;
} {
  const lines = html
    .split(/<br\s*\/?>/i)
    .map((part) => clean(cheerio.load(`<div>${part}</div>`)("div").text()))
    .filter(Boolean);

  let subject = lines.shift() ?? "";
  const teachers: string[] = [];
  const notes: string[] = [];

  // «Английский язык» + «(профессиональная лексика), ст.преп. Кашкан Т.А.»:
  // уточнение в скобках относится к названию предмета, а не к преподавателю
  if (lines.length > 0) {
    const continuation = lines[0].match(/^(\([^)]*\))\s*,?\s*(.*)$/);
    const isPeriodNote = /\d{1,2}\.\d{1,2}|кроме|отработка/iu.test(
      continuation?.[1] ?? "",
    );
    if (continuation && !isPeriodNote) {
      subject = `${subject} ${continuation[1]}`.trim();
      if (continuation[2]) lines[0] = continuation[2];
      else lines.shift();
    }
  }

  const PERIOD_NOTE = /^\((?=[^)]*(?:\d|кроме|отработка))[^)]*\)$/iu;
  const INITIALS_ONLY = /^[А-ЯЁA-Z]\.\s?[А-ЯЁA-Z]?\.?$/u;

  for (const line of lines) {
    if (isTeacherLine(line)) {
      // «доц. Долгополова О.Б. (с 02.11)» — период относится к паре, не к имени
      const withPeriod = line.match(/^(.*?)\s*(\([^)]*\))$/);
      if (withPeriod && PERIOD_NOTE.test(withPeriod[2])) {
        teachers.push(withPeriod[1]);
        notes.push(withPeriod[2]);
      } else {
        teachers.push(line);
      }
      continue;
    }

    // «асс. Грицель» + «В.Э.» — фамилия и инициалы разнесены по строкам
    if (INITIALS_ONLY.test(line) && teachers.length > 0) {
      teachers[teachers.length - 1] = `${teachers[teachers.length - 1]} ${line}`;
      continue;
    }

    notes.push(line);
  }

  return {
    subject,
    teacher: teachers.join(", "),
    notes: notes.join(" "),
  };
}

export function parseSchedule(
  html: string,
  course: number,
  group: string,
  semesterStart = SEMESTER_START,
): Schedule {
  const $ = cheerio.load(html);
  const table = $(".content-area table").first();

  const caption = clean(table.find("caption").first().text());
  const captionMatch = caption.match(/^(\S+)\s*(?:Обновлено\s*(.*))?$/);

  const lessons: Lesson[] = [];
  let currentDay: DayId | null = null;

  table.find("tr").each((rowIndex, element) => {
    const row = $(element) as unknown as cheerio.Cheerio<never>;
    if (row.find("th").length > 0) return;

    const cells = row.find("td");
    if (cells.length < 3) return;

    const day =
      parseDay(cellText($, row, "weekday", 0).text()) ?? currentDay;
    if (!day) return;
    currentDay = day;

    const time = parseTime(cellText($, row, "time", 1).text());
    if (!time) return;

    const subjectCell = cellText($, row, "subject-teachers", 3);
    const { subject, teacher, notes } = splitSubjectCell(
      subjectCell.html() ?? "",
    );
    if (!subject) return;

    const { week, subgroups } = parseRemarks(
      cellText($, row, "remarks", 2).text(),
    );

    lessons.push({
      id: `${day}-${time.start}-${rowIndex}`,
      day,
      start: time.start,
      end: time.end,
      subject,
      teacher,
      type: parseType(cellText($, row, "lecture-practice", 4).text()),
      room: clean(cellText($, row, "room", 5).text()),
      week,
      subgroups,
      notes,
      ...parseNoteDates(notes, semesterStart),
    });
  });

  lessons.sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    return dayDiff !== 0 ? dayDiff : a.start.localeCompare(b.start);
  });

  return {
    course,
    group,
    groupTitle: captionMatch?.[1] ?? `${course}-${group}`,
    speciality: clean($(".programme").first().text()),
    updatedAt: clean(captionMatch?.[2] ?? ""),
    sourceUrl: "",
    lessons,
  };
}
