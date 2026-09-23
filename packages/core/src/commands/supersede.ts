import { optionString } from "../cli-utils.js";
import type { LessonStore } from "../storage.js";
import { findLesson } from "./find-lesson.js";
import type { CommandDefinition } from "./registry.js";

function supersedeLesson(
  store: LessonStore,
  oldIdPrefix: string,
  newIdPrefix: string,
  options: Record<string, string | boolean>,
): void {
  const oldLesson = findLesson(store, oldIdPrefix);
  const newLesson = findLesson(store, newIdPrefix);
  const reason = optionString(options.reason);

  store.supersede(oldLesson.id, newLesson.id, reason);
  console.log(`Superseded ${oldLesson.id} -> ${newLesson.id}${reason ? `: ${reason}` : ""}`);
}

export const supersedeCommand: CommandDefinition = {
  names: ["supersede"],
  usage: ['  fixmind supersede <oldId> <newId> [--reason "..."]'],
  kind: "store",
  run: ({ options, positionals, store }) => {
    const oldId = positionals[0];
    const newId = positionals[1];
    if (!oldId || !newId) {
      throw new Error('Usage: fixmind supersede <oldId> <newId> [--reason "..."]');
    }
    supersedeLesson(store, oldId, newId, options);
  },
};
