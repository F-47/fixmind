import { formatDate, reviewAction, statusLabel } from "../format";
import type { DashboardLesson } from "../types";

interface Props {
  lesson: DashboardLesson;
  due: boolean;
  onOpen(lesson: DashboardLesson, review: boolean): void;
}

export function LessonCard({ lesson, due, onOpen }: Props) {
  return (
    <article
      className="grid cursor-pointer grid-cols-[6px_1fr_auto] gap-4 rounded-2xl border border-line bg-gradient-to-br from-[#12171d] to-[#0d1115] p-4 transition hover:-translate-y-0.5 hover:border-[#455463] max-sm:grid-cols-[5px_1fr]"
      onClick={() => onOpen(lesson, false)}
    >
      <span className={`rounded-full ${due ? "bg-warn" : "bg-sky"}`} />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="m-0 text-[17px] font-semibold">{lesson.title}</h3>
          <span className="text-[11px] text-muted">
            {lesson.tool} &middot; {formatDate(lesson.createdAt)}
          </span>
        </div>
        <p className="my-2.5 text-sm leading-relaxed text-[#dce5ee]">{lesson.displayTakeaway}</p>
        <div className="flex flex-wrap items-center gap-2">
          {lesson.concepts.map((concept) => (
            <span
              className="rounded-full border border-[#243e54] bg-[#142333] px-2 py-1 text-[10px] text-sky"
              key={concept}
            >
              {concept}
            </span>
          ))}
          <button
            className="cursor-pointer border-0 bg-transparent p-1 text-[11px] text-muted hover:text-mint"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(lesson, due);
            }}
          >
            {reviewAction(lesson.nextReviewAt)}
          </button>
        </div>
      </div>
      <span
        className={`self-start whitespace-nowrap rounded-full px-2 py-1 text-[10px] max-sm:hidden ${statusClasses(lesson.understanding)}`}
      >
        {statusLabel(lesson.understanding)}
      </span>
    </article>
  );
}

function statusClasses(status: DashboardLesson["understanding"]): string {
  if (status === "understood") return "bg-[#11271f] text-mint";
  if (status === "partial") return "bg-[#2a2111] text-warn";
  if (status === "copied_blindly") return "bg-[#2c151a] text-danger";
  return "bg-[#1b232c] text-muted";
}
