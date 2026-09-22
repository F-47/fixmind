import { formatLessonList, numberOption } from "../cli-utils.js";
import type { CommandDefinition } from "./registry.js";

export const listCommand: CommandDefinition = {
  names: ["list"],
  usage: ["  fixmind list [--limit 20] [--include-superseded]"],
  kind: "store",
  run: ({ options, store }) => {
    const includeSuperseded = Boolean(options["include-superseded"]);
    const lessons = store
      .list(numberOption(options.limit, 20))
      .filter((lesson) => includeSuperseded || lesson.status !== "superseded");
    console.log(formatLessonList(lessons));
  },
};
