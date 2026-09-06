import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseSchedule, splitSubjectCell } from "../lib/parseSchedule";
import { parseCourseGroups } from "../lib/parseCatalog";
import { collectSubgroupOptions, matchesDate, visibleLessons } from "../lib/filterLessons";
import { dateOfDayFromMonday, dateOfDayInWeek, displayWeek, nextDisplayWeekMonday, weekForDate } from "../lib/week";

const scheduleHtml = readFileSync(
  new URL("./fixtures/3-8.html", import.meta.url),
  "utf8",
);
const courseHtml = readFileSync(
  new URL("./fixtures/course-3.html", import.meta.url),
  "utf8",
);

const schedule = parseSchedule(scheduleHtml, 3, "8-gruppa");

test("метаданные расписания", () => {
  assert.equal(schedule.groupTitle, "3-8");
  assert.equal(schedule.speciality, "Механика и математическое моделирование (СИБД)");
  assert.match(schedule.updatedAt, /^\d{4}-\d{2}-\d{2}/);
  assert.ok(schedule.lessons.length > 25, `пар: ${schedule.lessons.length}`);
});

test("пара с подгруппами А,Б", () => {
  const lesson = schedule.lessons.find(
    (item) => item.subject === "Механика роботов и манипуляторов" && item.type === "lecture",
  );
  assert.ok(lesson);
  assert.deepEqual(lesson.subgroups, ["А", "Б"]);
  assert.equal(lesson.day, "monday");
  assert.equal(lesson.start, "14:30");
  assert.equal(lesson.end, "15:50");
  assert.equal(lesson.room, "238");
  assert.equal(lesson.teacher, "ст.преп. Авдейчик Е.В., проф. Богданович А.В.");
  assert.equal(lesson.week, null);
});

test("подгруппа вместе с неделей 1н/А", () => {
  const lesson = schedule.lessons.find(
    (item) => item.day === "wednesday" && item.start === "13:00" && item.subgroups.includes("А"),
  );
  assert.ok(lesson);
  assert.equal(lesson.week, 1);
  assert.equal(lesson.type, "lab");
});

test("пара без подгруппы", () => {
  const lesson = schedule.lessons.find((item) => item.subject === "Теория упругости");
  assert.ok(lesson);
  assert.deepEqual(lesson.subgroups, []);
  assert.equal(lesson.teacher, "доц. Босяков С.М.");
});

test("преподаватель без должности", () => {
  const lesson = schedule.lessons.find((item) => item.subject === "Компьютерная механика");
  assert.ok(lesson);
  assert.equal(lesson.teacher, "Карпович И.Н.");
});

test("период «с 29.09»", () => {
  const lesson = schedule.lessons.find(
    (item) => item.subject === "Уравнения математической физики",
  );
  assert.ok(lesson);
  assert.equal(lesson.dateFrom, "2026-09-29");
});

test("период «до 18.11»", () => {
  const lesson = schedule.lessons.find(
    (item) => item.subject === "Функциональный анализ" && item.type === "lecture",
  );
  assert.ok(lesson);
  assert.equal(lesson.dateTo, "2026-11-18");
});

test("разовое занятие 01.09", () => {
  const lesson = schedule.lessons.find((item) => item.subject.startsWith("Общереспубликанский"));
  assert.ok(lesson);
  assert.deepEqual(lesson.datesOnly, ["2026-09-01"]);
});

test("время физкультуры не путается с датами", () => {
  const lesson = schedule.lessons.find((item) => item.subject === "Физическая культура");
  assert.ok(lesson);
  assert.equal(lesson.datesOnly, undefined);
  assert.equal(lesson.start, "13:00");
});

test("уточнение в скобках остаётся частью предмета", () => {
  const cell = splitSubjectCell(
    "Английский язык<br />(профессиональная лексика), ст.преп. Кашкан Т.А.",
  );
  assert.equal(cell.subject, "Английский язык (профессиональная лексика)");
  assert.equal(cell.teacher, "ст.преп. Кашкан Т.А.");
});

test("период в скобках не приклеивается к предмету", () => {
  const cell = splitSubjectCell("Уравнения математической физики<br />(с 29.09)");
  assert.equal(cell.subject, "Уравнения математической физики");
  assert.equal(cell.notes, "(с 29.09)");
});

test("период из строки преподавателя уходит в заметки", () => {
  const cell = splitSubjectCell(
    "Теория функции комплексного переменного<br />доц. Долгополова О.Б. (с 02.11)",
  );
  assert.equal(cell.teacher, "доц. Долгополова О.Б.");
  assert.equal(cell.notes, "(с 02.11)");
});

test("инициалы с отдельной строки приклеиваются к фамилии", () => {
  const cell = splitSubjectCell("Численные методы<br />асс. Грицель<br />В.Э.");
  assert.equal(cell.teacher, "асс. Грицель В.Э.");
  assert.equal(cell.notes, "");
});

test("группы курса", () => {
  const groups = parseCourseGroups(courseHtml, 3);
  assert.ok(groups.length >= 10);
  assert.deepEqual(groups[0], {
    slug: "1-gruppa",
    title: "1 группа",
    speciality: "Математика и компьютерные науки. Математика",
  });
  assert.ok(groups.some((group) => group.slug === "11-gruppa"));
  assert.equal(groups.some((group) => group.slug === "10-gruppa"), false);
});

test("варианты подгрупп по предметам", () => {
  const options = collectSubgroupOptions(schedule.lessons);
  const byName = Object.fromEntries(options.map((item) => [item.subject, item.options]));
  assert.deepEqual(byName["Механика роботов и манипуляторов"], ["А", "Б"]);
  assert.deepEqual(byName["Китайский язык"], ["а", "б"]);
  assert.deepEqual(byName["Компьютерная механика"], ["а", "б"]);
  assert.equal(byName["Теория упругости"], undefined);
});

test("фильтр: подгруппа Б, 1-я неделя", () => {
  const lessons = visibleLessons(schedule.lessons, {
    date: "2026-09-02",
    week: 1,
    showAllWeeks: false,
    choices: { "Механика роботов и манипуляторов": "Б", "Общая биомеханика": "__not_mine__" },
  });

  assert.equal(lessons.some((item) => item.subject === "Общая биомеханика"), false);
  const robots = lessons.filter((item) => item.subject === "Механика роботов и манипуляторов");
  assert.ok(robots.length > 0);
  assert.ok(robots.every((item) => item.subgroups.includes("Б")));
  assert.ok(robots.every((item) => item.week === null || item.week === 1));
});

test("пары распределены по своим дням", () => {
  const saturday = schedule.lessons.filter((item) => item.day === "saturday");
  assert.equal(saturday.length, 3);
  assert.ok(saturday.every((item) => item.subject === "Аналитическая механика"));

  const monday = schedule.lessons.filter((item) => item.day === "monday");
  assert.equal(monday.some((item) => item.subject === "Аналитическая механика"), false);
});

test("нумерация недель от начала семестра", () => {
  assert.equal(weekForDate("2026-08-31"), 1);
  assert.equal(weekForDate("2026-09-06"), 1);
  assert.equal(weekForDate("2026-09-07"), 2);
  assert.equal(weekForDate("2026-09-14"), 1);
});

test("учебная неделя: вс открывает следующий пн–сб", () => {
  // воскресенье 6 сентября → показываем пн 7-е … сб 12-е (2н)
  assert.equal(dateOfDayInWeek("2026-09-06", "monday"), "2026-09-07");
  assert.equal(dateOfDayInWeek("2026-09-06", "saturday"), "2026-09-12");
  assert.equal(displayWeek("2026-09-06"), 2);

  // среда — дни внутри текущей учебной недели, а не «вперёд на следующую»
  assert.equal(dateOfDayInWeek("2026-09-02", "monday"), "2026-08-31");
  assert.equal(dateOfDayInWeek("2026-09-02", "wednesday"), "2026-09-02");
  assert.equal(dateOfDayInWeek("2026-09-02", "saturday"), "2026-09-05");
  assert.equal(displayWeek("2026-09-02"), 1);
});

test("следующая учебная неделя от отображаемой", () => {
  // вс 6.09 → текущая отображаемая пн 7.09, следующая — 14.09 (1н)
  assert.equal(nextDisplayWeekMonday("2026-09-06"), "2026-09-14");
  assert.equal(dateOfDayFromMonday("2026-09-14", "saturday"), "2026-09-19");
  assert.equal(weekForDate(nextDisplayWeekMonday("2026-09-06")), 1);
});

test("фильтр дат: с / до включительно", () => {
  const base = {
    id: "1",
    day: "monday" as const,
    start: "08:15",
    end: "09:35",
    subject: "X",
    teacher: "",
    room: "",
    type: "lecture" as const,
    week: null as 1 | 2 | null,
    subgroups: [] as string[],
    notes: "",
  };

  assert.equal(matchesDate({ ...base, dateTo: "2026-11-18" }, "2026-11-18"), true);
  assert.equal(matchesDate({ ...base, dateTo: "2026-11-18" }, "2026-11-19"), false);
  assert.equal(matchesDate({ ...base, dateFrom: "2026-09-29" }, "2026-09-28"), false);
  assert.equal(matchesDate({ ...base, dateFrom: "2026-09-29" }, "2026-09-29"), true);
});
