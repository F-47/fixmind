import type { CommandDefinition } from "./registry.js";

export const statusCommand: CommandDefinition = {
  names: ["status"],
  usage: ["  fixmind status"],
  kind: "store",
  run: ({ store }) => {
    const due = store.due();
    console.log(
      due.length === 0
        ? "Fixmind: no lessons due for review."
        : `Fixmind: ${due.length} lesson(s) due for review. Run \`fixmind review\`.`,
    );
  },
};
