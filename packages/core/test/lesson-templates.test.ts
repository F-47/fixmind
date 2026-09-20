import assert from "node:assert/strict";
import test from "node:test";
import {
  formatLessonTemplatePrompts,
  getLessonTemplate,
  LESSON_TEMPLATES,
  lessonTemplateOptions,
} from "../src/lesson-templates.js";

test("lesson templates expose the common bug shapes with stable ids", () => {
  assert.deepEqual(
    LESSON_TEMPLATES.map((template) => template.id),
    ["architecture-boundary", "stale-state", "async-timing", "off-by-one", "null-guard"],
  );
  assert.ok(LESSON_TEMPLATES.every((template) => template.prompt.length > 0));
  assert.ok(LESSON_TEMPLATES.every((template) => template.defaults.concepts.length > 0));
  assert.ok(LESSON_TEMPLATES.every((template) => template.reviewQuestion.question.length > 0));
  assert.ok(
    LESSON_TEMPLATES.every((template) => template.reviewQuestion.expectedAnswer.length > 0),
  );
});

test("lesson template lookup and picker options stay in sync", () => {
  const template = getLessonTemplate("stale-state");
  assert.equal(template?.label, "Stale state");
  assert.match(template?.description ?? "", /render, effect, or callback/);

  const options = lessonTemplateOptions();
  assert.deepEqual(options[0], {
    value: "",
    label: "Blank",
    hint: "Start from scratch and fill in your own lesson shape.",
  });
  assert.equal(options.length, LESSON_TEMPLATES.length + 1);
  assert.equal(options[2].value, "stale-state");
  assert.match(formatLessonTemplatePrompts(), /Architecture boundary/);
  assert.match(formatLessonTemplatePrompts(), /Null guard/);
});
