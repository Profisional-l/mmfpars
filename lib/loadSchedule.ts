import * as cheerio from "cheerio";
import { parseSchedule } from "./parseSchedule";
import { fetchPage } from "./source";
import type { Schedule } from "./types";

/** Only follow published Google Sheets embedded in the faculty content. */
export function embeddedSheetUrl(html: string): string | null {
  const $ = cheerio.load(html);
  for (const frame of $(".content-area iframe[src]").toArray()) {
    try {
      const url = new URL($(frame).attr("src") ?? "");
      if (url.protocol !== "https:" || url.hostname !== "docs.google.com" ||
          !/^\/spreadsheets\/d\/e\/[a-zA-Z0-9_-]+\/pubhtml\/?$/.test(url.pathname)) continue;
      const gid = url.searchParams.get("gid");
      if (!gid || !/^\d+$/.test(gid)) continue;
      // pubhtml itself is a JavaScript viewer; /sheet returns the actual cells.
      return `${url.origin}${url.pathname.replace(/\/$/, "")}/sheet?headers=false&gid=${gid}`;
    } catch {
      // An unrelated or malformed iframe isn't a schedule source.
    }
  }
  return null;
}

export async function loadSchedule(
  url: string,
  course: number,
  group: string,
  fresh = false,
  readPage: typeof fetchPage = fetchPage,
): Promise<Schedule> {
  const html = await readPage(url, fresh);
  const schedule = parseSchedule(html, course, group);
  const sheetUrl = embeddedSheetUrl(html);
  if (schedule.lessons.length > 0 || !sheetUrl) return schedule;

  let sheetHtml: string;
  try {
    sheetHtml = await readPage(sheetUrl, fresh);
  } catch (error) {
    console.error("MMF embedded schedule request failed", { sheetUrl, error });
    throw new Error("Не удалось загрузить Google-таблицу расписания, встроенную на сайте мехмата. Попробуйте обновить позже.");
  }
  const embedded = parseSchedule(sheetHtml, course, group);
  return { ...embedded, groupTitle: schedule.groupTitle, speciality: schedule.speciality };
}
