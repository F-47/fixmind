import { isStarterLesson } from "../starter-lessons.js";
import type { CommandDefinition } from "./registry.js";

export const statsCommand: CommandDefinition = {
  names: ["stats"],
  usage: ["  fixmind stats"],
  kind: "store",
  run: ({ store }) => {
    const concepts = store.conceptStats(isStarterLesson);
    const mistakes = store.mistakeStats(isStarterLesson);
    console.log("Repeated concepts");
    console.log(
      concepts.length
        ? concepts.map((item) => `${item.name}: ${item.count} time(s)`).join("\n")
        : "No data yet.",
    );
    console.log("\nRepeated mistakes");
    console.log(
      mistakes.length
        ? mistakes.map((item) => `${item.mistake}: ${item.count} time(s)`).join("\n")
        : "No data yet.",
    );
  },
};
