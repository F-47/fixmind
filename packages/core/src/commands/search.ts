import { formatLessonList } from "../cli-utils.js";
import type { CommandDefinition } from "./registry.js";

export const searchCommand: CommandDefinition = {
  names: ["search"],
  usage: ["  fixmind search <query> [--include-superseded]"],
  kind: "store",
  run: ({ options, positionals, store }) => {
    const query = positionals.join(" ").trim();
    if (!query) throw new Error("Usage: fixmind search <query>");
    console.log(
      formatLessonList(
        store.search(query, {
          includeSuperseded: Boolean(options["include-superseded"]),
        }),
      ),
    );
  },
};
