import { buildLearningInsights, formatLearningInsightsReport } from "../learning-insights.js";
import { isStarterLesson } from "../starter-lessons.js";
import type { CommandDefinition } from "./registry.js";

export const insightsCommand: CommandDefinition = {
  names: ["insights"],
  usage: ["  fixmind insights [--weekly]"],
  kind: "store",
  run: ({ options, store }) => {
    const weekly = Boolean(options.weekly);
    const lessons = store
      .list(Number.MAX_SAFE_INTEGER)
      .filter((lesson) => lesson.status !== "superseded" && !isStarterLesson(lesson));
    const insights = buildLearningInsights(lessons, new Date(), weekly ? 7 : 30);
    console.log(formatLearningInsightsReport(insights).join("\n"));
    if (weekly) {
      console.log(`\nDue for review now: ${store.due().length}`);
    }
  },
};
