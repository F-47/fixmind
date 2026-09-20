import type { LessonStore } from "../storage.js";
import type { Lesson } from "../types.js";

export function findLesson(store: LessonStore, idOrPrefix: string): Lesson {
  const exact = store.get(idOrPrefix);
  if (exact) return exact;

  const matches = store
    .list(Number.MAX_SAFE_INTEGER)
    .filter((lesson) => lesson.id.startsWith(idOrPrefix));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`"${idOrPrefix}" matches ${matches.length} lessons. Use a longer id prefix.`);
  }
  throw new Error(`Lesson not found: ${idOrPrefix}`);
}
