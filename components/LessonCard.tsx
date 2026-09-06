import { LESSON_TYPE_LABELS, type Lesson } from "@/lib/types";

function Chip({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "accent" }) {
  const styles =
    tone === "accent"
      ? "bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
      : "border border-[var(--color-line)] text-[var(--color-muted)]";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] leading-4 ${styles}`}>
      {children}
    </span>
  );
}

export default function LessonCard({
  lesson,
  isNow,
}: {
  lesson: Lesson;
  isNow: boolean;
}) {
  const typeLabel = LESSON_TYPE_LABELS[lesson.type];

  return (
    <li
      className={`rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-3 ${
        isNow
          ? "border-[var(--color-accent)]"
          : "border-[var(--color-line)]"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums">
          {lesson.start}–{lesson.end}
        </span>
        {isNow && <Chip tone="accent">сейчас</Chip>}
      </div>

      <p className="mt-1 text-[15px] leading-5 font-medium break-words">
        {lesson.subject}
      </p>

      {lesson.teacher && (
        <p className="mt-1 text-[13px] leading-5 text-[var(--color-muted)] break-words">
          {lesson.teacher}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {lesson.room && <Chip>ауд. {lesson.room}</Chip>}
        {typeLabel && <Chip>{typeLabel}</Chip>}
        {lesson.week && <Chip>{lesson.week}н</Chip>}
        {lesson.subgroups.map((subgroup) => (
          <Chip key={subgroup}>{subgroup}</Chip>
        ))}
        {lesson.notes && <Chip>{lesson.notes}</Chip>}
      </div>
    </li>
  );
}
