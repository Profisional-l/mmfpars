import * as cheerio from "cheerio";
import type { GroupRef } from "./types";

const EM_SPACE = "\u2003";

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Группы курса берём со страницы курса — состав групп меняется от курса к курсу. */
export function parseCourseGroups(html: string, course: number): GroupRef[] {
  const $ = cheerio.load(html);
  const groups: GroupRef[] = [];
  const seen = new Set<string>();

  $(".content-area a[href]").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const match = href.match(
      new RegExp(`/${course}-kurs/([^/?#]+)/?$`),
    );
    if (!match) return;

    const slug = match[1];
    if (seen.has(slug)) return;

    const raw = $(element).text().replace(/\u00a0/g, " ");
    const [titlePart, ...specialityParts] = raw.split(EM_SPACE);
    const title = clean(titlePart);
    if (!title) return;

    seen.add(slug);
    groups.push({
      slug,
      title,
      speciality: clean(specialityParts.join(" ")),
    });
  });

  return groups;
}
