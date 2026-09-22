import { stdin, stdout } from "node:process";
import { intro, log, note, outro, select, text } from "@clack/prompts";
import { common, unwrap } from "../cli-utils.js";
import type { LessonStore } from "../storage.js";
import type { ReviewQuestion, Understanding } from "../types.js";
import type { CommandDefinition } from "./registry.js";

async function review(store: LessonStore): Promise<void> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("The review command requires an interactive terminal.");
  }
  const due = store.due();
  if (due.length === 0) {
    console.log("No lessons are due for review.");
    return;
  }

  intro("Review learning lessons", common);
  log.info(`${due.length} lesson(s) due.`, common);
  for (const lesson of due) {
    note(
      `Problem: ${lesson.problem}\nTakeaway: ${lesson.takeaway ?? lesson.fixSummary}`,
      lesson.title,
      common,
    );
    const questions: ReviewQuestion[] = [];
    for (const question of lesson.reviewQuestions) {
      const answer = unwrap(
        await text({
          message: `${question.question}\nYour answer (or "skip")`,
          ...common,
        }),
      );
      const skipped = answer.toLocaleLowerCase() === "skip";
      questions.push({
        ...question,
        userAnswer: skipped ? undefined : answer,
        status: skipped ? "skipped" : "answered",
      });
      if (!skipped) {
        log.info(`Expected: ${question.expectedAnswer}`, common);
      }
    }
    const understanding = await askUnderstanding();
    const updated = store.updateReview(lesson.id, questions, understanding);
    log.info(`Review saved. Next review: ${updated.nextReviewAt}`, common);
  }
  outro("Review session complete.", common);
}

async function askUnderstanding(): Promise<Understanding> {
  return unwrap(
    await select({
      message: "How well do you understand this lesson now?",
      options: [
        {
          value: "understood",
          label: "I understand it",
          hint: "I can explain the rule and apply it elsewhere.",
        },
        {
          value: "partial",
          label: "I partly understand it",
          hint: "I get the shape but still need practice.",
        },
        {
          value: "copied_blindly",
          label: "I need more practice",
          hint: "I can repeat the fix but not generalize it yet.",
        },
      ],
      initialValue: "partial",
      ...common,
    }),
  );
}

export const reviewCommand: CommandDefinition = {
  names: ["review"],
  usage: ["  fixmind review"],
  kind: "store",
  run: ({ store }) => review(store),
};
