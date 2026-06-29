import assert from "node:assert/strict";
import test from "node:test";
import { assessLessonQuality, validateLessonInput } from "../src/validation.js";
import { lessonQualityCases } from "./fixtures/lesson-quality-cases.js";

function lesson(overrides: Record<string, unknown> = {}) {
  return validateLessonInput({
    title: "Hydration mismatch",
    problem: "Initial markup differed between server and client",
    mistake: "Read localStorage during server-side rendering",
    rootCause: "Browser-only APIs are unavailable while the server renders the page",
    fixSummary: "Moved the localStorage read into a useEffect that runs after mount, so the server and client render identical markup on the first paint.",
    takeaway: "Read browser-only state inside useEffect, after mount.",
    whenNotApplicable: "Does not apply to values that are identical on server and client.",
    concepts: ["hydration"],
    badCodeExample: "const theme = localStorage.getItem('theme')",
    goodCodeExample: "useEffect(() => setTheme(localStorage.getItem('theme')), [])",
    reviewQuestions: [{
      question: "When is it safe to read localStorage?",
      expectedAnswer: "After the component has mounted in the browser.",
    }],
    ...overrides,
  });
}

test("assessLessonQuality accepts a well-formed lesson with no errors or warnings", () => {
  const { errors, warnings } = assessLessonQuality(lesson());
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("assessLessonQuality rejects a mechanical move/extract refactor with no code comparison", () => {
  const { errors } = assessLessonQuality(lesson({
    mistake: "Moved the helper into a new file",
    fixSummary: "Extracted the helper into utils.ts",
    badCodeExample: undefined,
    goodCodeExample: undefined,
  }));
  assert.ok(errors.some((message) => /mechanical/i.test(message)), errors.join("\n"));
});

test("assessLessonQuality allows a refactor-worded fixSummary when the mistake is not a refactor", () => {
  const { errors } = assessLessonQuality(lesson({
    badCodeExample: undefined,
    goodCodeExample: undefined,
    fixSummary: "Refactored the fetch call to await the JSON body before returning it",
  }));
  assert.deepEqual(errors, []);
});

test("assessLessonQuality rejects rootCause that repeats mistake word-for-word", () => {
  const { errors } = assessLessonQuality(lesson({
    rootCause: "Read localStorage during server-side rendering",
  }));
  assert.ok(errors.some((message) => /rootCause/.test(message)), errors.join("\n"));
});

test("assessLessonQuality rejects rootCause that repeats problem word-for-word", () => {
  const { errors } = assessLessonQuality(lesson({
    mistake: "Used the wrong storage API entirely",
    problem: "Read localStorage during server-side rendering",
    rootCause: "Read localStorage during server-side rendering",
  }));
  assert.ok(errors.some((message) => /rootCause/.test(message)), errors.join("\n"));
});

test("assessLessonQuality rejects fixSummary that repeats mistake word-for-word", () => {
  const { errors } = assessLessonQuality(lesson({
    fixSummary: "Read localStorage during server-side rendering",
  }));
  assert.ok(errors.some((message) => /fixSummary/.test(message)), errors.join("\n"));
});

test("assessLessonQuality warns when only one side of a code comparison is provided", () => {
  const { errors, warnings } = assessLessonQuality(lesson({ goodCodeExample: undefined }));
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((message) => message.includes("Quality notice")), warnings.join("\n"));
});

test("assessLessonQuality warns when a real fix with changed files has no code examples", () => {
  const { errors, warnings } = assessLessonQuality(lesson({
    badCodeExample: undefined,
    goodCodeExample: undefined,
    filesChanged: ["app/theme.tsx"],
  }));
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((message) => message.includes("Quality notice")), warnings.join("\n"));
});

test("assessLessonQuality returns field-level hints and autofill suggestions", () => {
  const result = assessLessonQuality(lesson({
    badCodeExample: undefined,
    goodCodeExample: undefined,
    filesChanged: ["app/page.tsx"],
  }));

  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.length > 0, result.warnings.join("\n"));
  assert.ok(
    result.fieldHints.some(
      (hint) =>
        hint.field === "codeExamples" &&
        /badCodeExample and goodCodeExample/i.test(hint.suggestion),
    ),
    JSON.stringify(result.fieldHints, null, 2),
  );
  assert.ok(
    result.fieldHints.some(
      (hint) =>
        hint.field === "mistakePattern" &&
        hint.autofill === "Hydration timing",
    ),
    JSON.stringify(result.fieldHints, null, 2),
  );
});

test("assessLessonQuality has no warnings for a concept-only lesson with no files changed", () => {
  const { errors, warnings } = assessLessonQuality(lesson({
    badCodeExample: undefined,
    goodCodeExample: undefined,
  }));
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

// Calibration set: realistic submissions labeled with the verdict
// assessLessonQuality should produce. See test/fixtures/lesson-quality-cases.ts
// for the full reasoning behind each case.
for (const calibrationCase of lessonQualityCases) {
  test(`calibration: ${calibrationCase.name}`, () => {
    const { errors, warnings } = assessLessonQuality(validateLessonInput(calibrationCase.input));

    if (calibrationCase.expect === "pass") {
      assert.deepEqual(errors, [], errors.join("\n"));
      assert.deepEqual(warnings, [], warnings.join("\n"));
      return;
    }

    if (calibrationCase.expect === "reject") {
      assert.ok(errors.length > 0, "expected at least one error");
      if (calibrationCase.reasonPattern) {
        assert.ok(
          errors.some((message) => calibrationCase.reasonPattern!.test(message)),
          errors.join("\n"),
        );
      }
      return;
    }

    // expect === "warn": saved, but with actionable feedback - not a hard error.
    assert.deepEqual(errors, [], errors.join("\n"));
    assert.ok(warnings.length > 0, "expected at least one warning");
    if (calibrationCase.reasonPattern) {
      assert.ok(
        warnings.some((message) => calibrationCase.reasonPattern!.test(message)),
        warnings.join("\n"),
      );
    }
  });
}

test("assessLessonQuality rejects a styling-only change with no behavior signal", () => {
  const { errors } = assessLessonQuality(lesson({
    problem: "The save button's color didn't match the design system on the settings page.",
    mistake:
      "Used a custom hex color for the save button's background instead of the design system's primary color token.",
    rootCause: "The button's className hardcoded bg-[#2563eb] instead of the bg-primary utility class.",
    fixSummary: "Changed the button's className from bg-[#2563eb] to bg-primary.",
  }));
  assert.ok(errors.some((message) => /UI-only|styling/i.test(message)), errors.join("\n"));
});

test("assessLessonQuality does not reject a styling-related change that also describes a behavior bug", () => {
  const { errors } = assessLessonQuality(lesson({
    problem: "A long product name overflowed its container and covered the price next to it.",
    mistake: "Used a fixed width and no overflow handling on the product name, assuming names would always be short.",
    rootCause:
      "CSS containers don't wrap or truncate text by default, so a name longer than the fixed width renders outside the box and overlaps adjacent elements.",
    fixSummary:
      "Added text-overflow: ellipsis and a max-width, so long names are truncated instead of overflowing into the price.",
  }));
  assert.deepEqual(errors, []);
});

test("assessLessonQuality does not treat specific-but-blunt wording as a generic placeholder", () => {
  const { errors } = assessLessonQuality(lesson({
    mistake: "Assumed the API response always included a `total` field and read response.total directly.",
    rootCause:
      "The API omits `total` entirely when the result set is empty, so response.total is undefined rather than 0.",
    fixSummary: "Default to 0 when response.total is undefined, since an empty result set means a total of zero.",
  }));
  assert.deepEqual(errors, []);
});

test("assessLessonQuality does not warn about near-duplicate rootCause when it adds a new mechanism", () => {
  const { warnings } = assessLessonQuality(lesson({
    mistake:
      "Checked whether the cart was empty by comparing cart.items.length to zero before the items had finished loading.",
    rootCause:
      "The items array starts empty and is populated asynchronously after an API call, so the length check runs before the API response arrives and always sees zero.",
    fixSummary:
      "Wait for the cart items to finish loading before checking length, since an empty array during loading looks identical to a genuinely empty cart.",
  }));
  assert.ok(!warnings.some((message) => /rootCause/i.test(message)), warnings.join("\n"));
});

test("assessLessonQuality does not reject review questions when at least one is a transfer question", () => {
  const { errors } = assessLessonQuality(lesson({
    reviewQuestions: [
      { question: "What did you change to fix this?", expectedAnswer: "Moved the read into useEffect." },
      {
        question:
          "A teammate reads document.cookie at the top of a component body to decide what to render. What will happen on the server, and how should they fix it?",
        expectedAnswer:
          "The server has no document.cookie, so it would throw or read undefined, causing a mismatch. They should read it inside useEffect after mount, like the localStorage case.",
      },
    ],
  }));
  assert.ok(!errors.some((message) => /transfer/i.test(message)), errors.join("\n"));
});

test("assessLessonQuality does not warn about a patch-verb fixSummary that explains why it works", () => {
  const { warnings } = assessLessonQuality(lesson({
    fixSummary:
      "Added a null check before rendering the avatar, because user.avatar can be null for accounts created before avatars existed.",
  }));
  assert.ok(!warnings.some((message) => /patch/i.test(message)), warnings.join("\n"));
});

test("assessLessonQuality does not treat 'Fixed the bug by ...' as a generic placeholder when it explains the mechanism", () => {
  const { errors } = assessLessonQuality(lesson({
    fixSummary:
      "Fixed the bug by reading localStorage inside useEffect instead of during render, because the server has no localStorage to read from.",
  }));
  assert.deepEqual(errors, []);
});

test("assessLessonQuality still rejects a fixSummary that is just 'Fixed the bug' with nothing else", () => {
  const { errors } = assessLessonQuality(lesson({
    fixSummary: "Fixed the bug.",
  }));
  assert.ok(errors.some((message) => /generic placeholder/i.test(message)), errors.join("\n"));
});

test("assessLessonQuality does not reject a real fix worded with 'moved'/'refactored' when a behavior signal is present", () => {
  const { errors } = assessLessonQuality(lesson({
    problem: "The page fired the same API request in an infinite loop, freezing the tab.",
    mistake: "Moved the fetch into a useEffect with no dependency array, so it ran after every render.",
    fixSummary: "Refactored the effect to depend on [filters], so it only refetches when filters actually change.",
    badCodeExample: undefined,
    goodCodeExample: undefined,
  }));
  assert.ok(!errors.some((message) => /mechanical/i.test(message)), errors.join("\n"));
});

test("assessLessonQuality rejects review questions phrased as 'how did you fix this'", () => {
  const { errors } = assessLessonQuality(lesson({
    reviewQuestions: [{
      question: "How did you fix this bug?",
      expectedAnswer: "Moved the read into useEffect.",
    }],
  }));
  assert.ok(errors.some((message) => /transfer/i.test(message)), errors.join("\n"));
});
