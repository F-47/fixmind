import { formatDate, statusColor, statusLabel } from "@/lib/format";
import { cn } from "@/components/shared/cn";
import type { DashboardLesson } from "@/lib/types";
import { lessonTagClass } from "@/components/lesson/lessonStyles";

export function LessonHeader({ lesson }: { lesson: DashboardLesson }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[.2em] text-muted">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{lesson.displayPattern}</span>
          <span>&middot;</span>
          <span>{formatDate(lesson.createdAt)}</span>
          <span>&middot;</span>
          <span>{lesson.tool}</span>
        </div>
        <span
          className={cn("flex items-center gap-1.5", statusColor(lesson.understanding))}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {statusLabel(lesson.understanding)}
        </span>
      </div>

      <h1 className="mt-3 font-serif text-[2.65rem] leading-tight font-bold tracking-tight sm:text-4xl">
        {lesson.title}
      </h1>
      <p className="mt-3 text-[17px] leading-relaxed text-muted sm:text-lg">
        {lesson.displayTakeaway}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {lesson.concepts.map((concept) => (
          <span className={lessonTagClass} key={concept}>
            {concept}
          </span>
        ))}
        {lesson.tags?.map((tag) =>
          tag.url ? (
            <a
              key={tag.name}
              href={tag.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                lessonTagClass,
                "text-accent no-underline hover:border-accent",
              )}
            >
              {tag.name} &#8599;
            </a>
          ) : (
            <span className={cn(lessonTagClass, "text-accent")} key={tag.name}>
              {tag.name}
            </span>
          ),
        )}
      </div>
    </>
  );
}
