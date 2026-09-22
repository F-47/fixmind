import { numberOption } from "../cli-utils.js";
import { formatSessionInjection, selectInjectionLessons } from "../session-injection.js";
import { createLessonStore, initializeDataDirectory } from "../storage.js";
import type { CommandDefinition } from "./registry.js";

export const injectCommand: CommandDefinition = {
  names: ["inject"],
  usage: ["  fixmind inject [--limit 5]"],
  kind: "standalone",
  run: ({ options }) => {
    initializeDataDirectory();
    const store = createLessonStore();
    try {
      const lessons = selectInjectionLessons(store, { limit: numberOption(options.limit, 5) });
      const text = formatSessionInjection(lessons);
      if (text) console.log(text);
    } finally {
      store.close();
    }
  },
};
