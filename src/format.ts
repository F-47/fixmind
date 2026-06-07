import type { Lesson } from "./types.js";

export function formatLessonList(lessons: Lesson[]): string {
  if (lessons.length === 0) return "No lessons found.";
  return lessons.map((lesson) => {
    const concepts = lesson.concepts.join(", ") || "none";
    return [
      `${lesson.id.slice(0, 8)}  ${lesson.title}`,
      `  concepts: ${concepts}`,
      `  understanding: ${lesson.understanding} | next review: ${formatDate(lesson.nextReviewAt)}`,
    ].join("\n");
  }).join("\n\n");
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}
