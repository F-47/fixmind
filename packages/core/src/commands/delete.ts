import { stdin, stdout } from "node:process";
import { confirm } from "@clack/prompts";
import { common, unwrap } from "../cli-utils.js";
import type { LessonStore } from "../storage.js";
import { findLesson } from "./find-lesson.js";
import type { CommandDefinition } from "./registry.js";

async function deleteLesson(
  store: LessonStore,
  idOrPrefix: string,
  options: Record<string, string | boolean>,
): Promise<void> {
  const lesson = findLesson(store, idOrPrefix);
  const interactive = stdin.isTTY && stdout.isTTY;

  let confirmed = Boolean(options.yes);
  if (!confirmed && interactive) {
    confirmed = unwrap(
      await confirm({
        message: `Delete "${lesson.title}"? This cannot be undone.`,
        initialValue: false,
        ...common,
      }),
    );
  }

  if (!confirmed) {
    if (!interactive) {
      throw new Error(
        `Refusing to delete without confirmation. Re-run with --yes: fixmind delete ${idOrPrefix} --yes`,
      );
    }
    console.log("Cancelled.");
    return;
  }

  store.delete(lesson.id);
  console.log(`Deleted lesson ${lesson.id}: ${lesson.title}`);
}

export const deleteCommand: CommandDefinition = {
  names: ["delete"],
  usage: ["  fixmind delete <id> [--yes | -y]"],
  kind: "store",
  run: ({ options, positionals, store }) => {
    const id = positionals[0];
    if (!id) throw new Error("Usage: fixmind delete <id> [--yes]");
    return deleteLesson(store, id, options);
  },
};
