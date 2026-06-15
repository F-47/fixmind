import { formatDate } from "./format.js";
import type { Lesson } from "./types.js";

const NOT_CAPTURED = "_Not captured._";

export function lessonToMarkdown(lesson: Lesson): string {
  const lines: string[] = [];

  lines.push(`# ${lesson.title}`);
  lines.push("");
  lines.push(
    [
      `Tool: ${lesson.tool}`,
      `Created: ${formatDate(lesson.createdAt)}`,
      `Updated: ${formatDate(lesson.updatedAt)}`,
      `Understanding: ${lesson.understanding}`,
      `Reviews completed: ${lesson.reviewCount}`,
      `Next review: ${formatDate(lesson.nextReviewAt)}`,
    ].join(" | "),
  );
  lines.push("");

  lines.push(`**Concepts:** ${lesson.concepts.join(", ")}`);
  if (lesson.tags.length) {
    const tags = lesson.tags.map((tag) => (tag.url ? `[${tag.name}](${tag.url})` : tag.name));
    lines.push(`**Tags:** ${tags.join(", ")}`);
  }
  lines.push("");

  lines.push("## Problem");
  lines.push(lesson.problem);
  lines.push("");

  lines.push("## Mistake");
  lines.push(lesson.mistake);
  lines.push("");

  lines.push("## Root cause");
  lines.push(lesson.rootCause);
  lines.push("");

  lines.push("## Fix");
  lines.push(lesson.fixSummary);
  lines.push("");

  lines.push("## Takeaway");
  lines.push(lesson.takeaway || NOT_CAPTURED);
  lines.push("");

  lines.push("## When this doesn't apply");
  lines.push(lesson.whenNotApplicable || NOT_CAPTURED);
  lines.push("");

  if (lesson.badCodeExample || lesson.goodCodeExample || lesson.codeExample) {
    lines.push("## Code comparison");
    lines.push("");
    lines.push("Wrong:");
    lines.push("```");
    lines.push(lesson.badCodeExample || NOT_CAPTURED);
    lines.push("```");
    lines.push("");
    lines.push("Correct:");
    lines.push("```");
    lines.push(lesson.goodCodeExample || lesson.codeExample || NOT_CAPTURED);
    lines.push("```");
    if (lesson.codeExplanation) {
      lines.push("");
      lines.push(lesson.codeExplanation);
    }
    lines.push("");
  }

  lines.push("## Practice task");
  lines.push(lesson.practiceTask || NOT_CAPTURED);
  lines.push("");

  if (lesson.filesChanged.length) {
    lines.push("## Files changed");
    for (const file of lesson.filesChanged) lines.push(`- ${file}`);
    lines.push("");
  }

  lines.push("## Review questions");
  for (const question of lesson.reviewQuestions) {
    lines.push(`- **Q:** ${question.question}`);
    lines.push(`  **Expected:** ${question.expectedAnswer}`);
    lines.push(`  **Your answer:** ${question.userAnswer || "(not yet answered)"}`);
  }

  return lines.join("\n").trimEnd();
}

export function lessonsToMarkdown(lessons: Lesson[]): string {
  return lessons.map(lessonToMarkdown).join("\n\n---\n\n");
}

export function lessonsToJson(lessons: Lesson[]): string {
  return JSON.stringify(lessons, null, 2);
}
