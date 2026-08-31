export const SITE_ORIGIN = "https://mmf.bsu.by";
export const SCHEDULE_BASE = `${SITE_ORIGIN}/ru/raspisanie-zanyatij/dnevnoe-otdelenie`;

export const COURSES = [1, 2, 3, 4];

export function courseUrl(course: number): string {
  return `${SCHEDULE_BASE}/${course}-kurs/`;
}

export function groupUrl(course: number, groupSlug: string): string {
  return `${SCHEDULE_BASE}/${course}-kurs/${groupSlug}/`;
}

const REVALIDATE_SECONDS = 1800;

export async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      // без user-agent сайт факультета иногда отдаёт 403
      "user-agent":
        "Mozilla/5.0 (compatible; mmf-schedule/1.0; +https://mmf.bsu.by)",
      "accept-language": "ru,en;q=0.8",
    },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`${url} вернул ${response.status}`);
  }

  return response.text();
}
