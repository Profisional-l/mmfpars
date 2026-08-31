import { NextResponse } from "next/server";
import { parseCourseGroups } from "@/lib/parseCatalog";
import { COURSES, courseUrl, fetchPage } from "@/lib/source";
import type { Catalog, CourseRef } from "@/lib/types";

export const revalidate = 1800;

export async function GET() {
  try {
    const courses = await Promise.all(
      COURSES.map(async (course): Promise<CourseRef> => {
        const html = await fetchPage(courseUrl(course));
        return { course, groups: parseCourseGroups(html, course) };
      }),
    );

    const catalog: Catalog = {
      courses: courses.filter((entry) => entry.groups.length > 0),
    };

    return NextResponse.json(catalog);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось загрузить список групп" },
      { status: 502 },
    );
  }
}
