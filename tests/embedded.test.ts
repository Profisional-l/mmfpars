import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { embeddedSheetUrl, loadSchedule } from "../lib/loadSchedule";
import { parseSchedule, parseTime } from "../lib/parseSchedule";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}.html`, import.meta.url), "utf8");
const page = fixture("3-8-current");
const sheet = fixture("3-8-google");
const url = "https://mmf.bsu.by/ru/raspisanie-zanyatij/dnevnoe-otdelenie/3-kurs/8-gruppa/";

test("загрузка встроенной Google-таблицы с сохранением метаданных ММФ", async () => {
  assert.equal(parseSchedule(page, 3, "8-gruppa").lessons.length, 0);
  const calls: [string, boolean | undefined][] = [];
  const schedule = await loadSchedule(url, 3, "8-gruppa", true, async (source, fresh) => {
    calls.push([source, fresh]);
    return source === url ? page : sheet;
  });
  assert.deepEqual(calls, [[url, true], [embeddedSheetUrl(page), true]]);
  assert.equal(schedule.groupTitle, "3-8");
  assert.equal(schedule.speciality, "Механика и математическое моделирование (СИБД)");
  assert.equal(schedule.lessons.length, 35);
  assert.equal(new Set(schedule.lessons.map(item => item.day)).size, 6);
});

test("Google: пустые ячейки времени, недели и подгруппы", () => {
  const schedule = parseSchedule(sheet, 3, "8-gruppa");
  const robots = schedule.lessons.filter(item => item.day === "wednesday" && item.start === "13:00");
  assert.deepEqual(robots.map(item => [item.week, item.subgroups]), [[1, ["А"]], [2, ["Б"]]]);
  const saturday = schedule.lessons.filter(item => item.day === "saturday");
  assert.equal(saturday.length, 4);
  assert.equal(saturday[0].start, "08:15");
  assert.equal(saturday[0].week, 2);
});

test("Google: время с точкой, вложенная разметка и даты", () => {
  assert.deepEqual(parseTime("17.40-19:00"), { start: "17:40", end: "19:00" });
  const lessons = parseSchedule(sheet, 3, "8-gruppa").lessons;
  const belarusian = lessons.find(item => item.subject.startsWith("Белорусский"));
  assert.ok(belarusian);
  assert.equal(belarusian.subject, "Белорусский язык (профессиональная лексика)");
  assert.equal(belarusian.teacher, "ст.преп. Галуза И.В.");
  assert.equal(belarusian.dateFrom, "2026-10-02");
  assert.equal(belarusian.start, "17:40");
  assert.equal(lessons.find(item => item.subject === "Китайский язык")?.room, "301 ФизФ");
});

test("прежний формат загружается без дополнительного запроса", async () => {
  let calls = 0;
  const schedule = await loadSchedule(url, 3, "8-gruppa", false, async () => {
    calls++;
    return fixture("3-8");
  });
  assert.equal(calls, 1);
  assert.ok(schedule.lessons.length > 25);
});

test("Google: время предыдущего дня не переносится на новый день", () => {
  const html = `<table class="waffle">
    <tr><th>1</th><td>Понедельник</td><td>19:10-20:30</td><td></td><td>Алгебра</td><td></td><td>101</td></tr>
    <tr><th>2</th><td>Вторник</td><td></td><td></td><td>Без времени</td><td></td><td>102</td></tr>
    <tr><th>3</th><td></td><td>08:15-09:35</td><td></td><td>Анализ</td><td></td><td>103</td></tr>
    </table>`;
  assert.deepEqual(parseSchedule(html, 1, "1-gruppa").lessons.map(item => [item.day, item.start, item.subject]), [
    ["monday", "19:10", "Алгебра"], ["tuesday", "08:15", "Анализ"],
  ]);
});

test("загрузка ограничена опубликованными листами Google", () => {
  assert.match(embeddedSheetUrl(page)!, /\/pubhtml\/sheet\?headers=false&gid=2147436143$/);
  for (const src of ["https://example.org/spreadsheets/d/e/id/pubhtml?gid=1", "http://docs.google.com/spreadsheets/d/e/id/pubhtml?gid=1", "https://docs.google.com/other?gid=1"]) {
    assert.equal(embeddedSheetUrl(`<div class="content-area"><iframe src="${src}"></iframe></div>`), null);
  }
});

test("недоступный встроенный лист возвращает понятную ошибку", async () => {
  await assert.rejects(loadSchedule(url, 3, "8-gruppa", false, async source => {
    if (source === url) return page;
    throw new Error("offline");
  }), /Не удалось загрузить Google-таблицу/);
});
