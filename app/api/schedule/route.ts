import { NextResponse } from "next/server";
import { loadSchedule } from "@/lib/loadSchedule";
import { groupUrl } from "@/lib/source";

export const revalidate = 1800;

const GROUP_SLUG = /^[a-z0-9-]+$/i;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const course = Number(params.get("course"));
  const group = params.get("group") ?? "";
  const fresh = params.get("fresh") === "1";

  if (!Number.isInteger(course) || course < 1 || course > 4) {
    return NextResponse.json({ error: "Некорректный курс" }, { status: 400 });
  }
  if (!GROUP_SLUG.test(group)) {
    return NextResponse.json({ error: "Некорректная группа" }, { status: 400 });
  }

  const url = groupUrl(course, group);

  try {
    const schedule = await loadSchedule(url, course, group, fresh);
    if (schedule.lessons.length === 0) {
      throw new Error("На странице мехмата не найдена таблица занятий. Возможно, изменилось расписание или разметка сайта.");
    }
    return NextResponse.json({ ...schedule, sourceUrl: url }, {
      headers: {
        "X-MMF-Region": process.env.VERCEL_REGION ?? "local",
        ...(fresh ? { "Cache-Control": "no-store" } : {}),
      },
    });
  } catch (error) {
    console.error("MMF schedule update failed", { course, group, error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить расписание",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
          "X-MMF-Region": process.env.VERCEL_REGION ?? "local",
        },
      },
    );
  }
}
