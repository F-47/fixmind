import { numberOption } from "../cli-utils.js";
import { formatMemoryResults, getMemoryResults } from "../memory.js";
import { createLessonStore, initializeDataDirectory } from "../storage.js";
import type { CommandDefinition } from "./registry.js";

export const memoryCommand: CommandDefinition = {
  names: ["memory"],
  usage: ["  fixmind memory [query] [--limit 5]"],
  kind: "standalone",
  run: ({ options, positionals }) => {
    initializeDataDirectory();
    const store = createLessonStore();
    try {
      const query = positionals.join(" ").trim();
      const memory = getMemoryResults(store, {
        query,
        limit: numberOption(options.limit, 5),
      });
      console.log(query ? `Memory for "${query}"` : "Memory");
      console.log(formatMemoryResults(memory));
    } finally {
      store.close();
    }
  },
};
