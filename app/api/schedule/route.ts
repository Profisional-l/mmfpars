import { NextResponse } from "next/server";
import { parseSchedule } from "@/lib/parseSchedule";
import { fetchPage, groupUrl } from "@/lib/source";

export const revalidate = 1800;

const GROUP_SLUG = /^[a-z0-9-]+$/i;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const course = Number(params.get("course"));
  const group = params.get("group") ?? "";

  if (!Number.isInteger(course) || course < 1 || course > 4) {
    return NextResponse.json({ error: "Некорректный курс" }, { status: 400 });
  }
  if (!GROUP_SLUG.test(group)) {
    return NextResponse.json({ error: "Некорректная группа" }, { status: 400 });
  }

  const url = groupUrl(course, group);

  try {
    const schedule = parseSchedule(await fetchPage(url), course, group);
    return NextResponse.json({ ...schedule, sourceUrl: url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить расписание",
      },
      { status: 502 },
    );
  }
}
