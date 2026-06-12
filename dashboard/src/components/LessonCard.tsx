import { useState } from "react";
import { formatDate, statusLabel } from "../format";
import type { DashboardLesson } from "../types";
import { Trash2 } from "lucide-react";

interface Props {
  lesson: DashboardLesson;
  onOpen(lesson: DashboardLesson, review: boolean): void;
  onDelete(id: string): void;
}

export function LessonCard({ lesson, onOpen, onDelete }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <article
      className="group cursor-pointer border-t border-line py-5 first:border-t-0"
      onClick={() => onOpen(lesson, false)}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-serif text-xl font-semibold tracking-tight transition group-hover:text-accent">
          {lesson.title}
        </h3>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[.15em] text-muted max-sm:hidden">
          {statusLabel(lesson.understanding)}
        </span>
      </div>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
        {lesson.displayTakeaway}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] text-muted">
        <span>{lesson.tool}</span>
        <span>{formatDate(lesson.createdAt)}</span>
        {lesson.concepts.length > 0 && <span>{lesson.concepts.join(", ")}</span>}
        {confirmingDelete ? (
          <span
            className="ml-auto flex items-center gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <span>Delete?</span>
            <button
              className="cursor-pointer border-0 bg-transparent p-0 font-bold text-danger hover:underline"
              onClick={() => onDelete(lesson.id)}
            >
              Confirm
            </button>
            <button
              className="cursor-pointer border-0 bg-transparent p-0 hover:underline"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            className="ml-auto cursor-pointer border-0 bg-transparent p-0 opacity-0 transition group-hover:opacity-100 hover:text-danger"
            onClick={(event) => {
              event.stopPropagation();
              setConfirmingDelete(true);
            }}
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}
