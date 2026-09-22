import assert from "node:assert/strict";
import test from "node:test";
import {
  lessonsToAnki,
  lessonsToJson,
  lessonsToMarkdown,
  lessonToMarkdown,
} from "../src/export.js";
import type { Lesson } from "../src/types.js";

function lesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "lesson-1",
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-02T00:00:00.000Z",
    tool: "codex",
    projectPath: "/tmp/project",
    title: "Hydration mismatch",
    originalPrompt: "Fix the theme toggle",
    problem: "Server and client markup differed",
    mistake: "Read localStorage during render",
    rootCause: "Browser APIs are unavailable during SSR",
    fixSummary: "Read localStorage after hydration",
    takeaway: "Keep server and browser output identical until hydration finishes.",
    mistakePattern: "Hydration timing",
    whenNotApplicable:
      "Does not apply to values that are identical on server and client, like static labels.",
    concepts: ["Next.js hydration", "SSR/browser APIs"],
    filesChanged: ["app/theme.tsx"],
    codeExample: undefined,
    badCodeExample: "const theme = localStorage.getItem('theme')",
    goodCodeExample: "useEffect(() => loadTheme(), [])",
    codeExplanation: "The fixed version reads browser-only state after hydration.",
    practiceTask: "Build a stable initial render.",
    reviewQuestions: [
      {
        id: "q1",
        question: "Why must initial renders match?",
        expectedAnswer: "Hydration reuses the server markup.",
        userAnswer: "Because hydration reuses server HTML.",
        status: "answered",
      },
    ],
    understanding: "understood",
    nextReviewAt: "2020-02-01T00:00:00.000Z",
    reviewCount: 1,
    ease: 2.6,
    lastIntervalDays: 7,
    sourceDiff: undefined,
    tags: [
      {
        name: "MDN: localStorage",
        url: "https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage",
      },
    ],
    status: "active",
    ...overrides,
  };
}

test("lessonToMarkdown renders all sections for a fully-populated lesson", () => {
  const markdown = lessonToMarkdown(lesson());

  assert.match(markdown, /^# Hydration mismatch/);
  assert.match(markdown, /Tool: codex/);
  assert.match(markdown, /Understanding: understood/);
  assert.match(markdown, /\*\*Concepts:\*\* Next\.js hydration, SSR\/browser APIs/);
  assert.match(
    markdown,
    /\*\*Tags:\*\* \[MDN: localStorage\]\(https:\/\/developer\.mozilla\.org\/en-US\/docs\/Web\/API\/Window\/localStorage\)/,
  );
  assert.match(markdown, /## Problem\nServer and client markup differed/);
  assert.match(markdown, /## Mistake\nRead localStorage during render/);
  assert.match(markdown, /## Root cause\nBrowser APIs are unavailable during SSR/);
  assert.match(markdown, /## Fix\nRead localStorage after hydration/);
  assert.match(markdown, /## Takeaway\nKeep server and browser output identical/);
  assert.match(markdown, /## When this doesn't apply\nDoes not apply to values that are identical/);
  assert.match(markdown, /## Code comparison/);
  assert.match(markdown, /const theme = localStorage\.getItem\('theme'\)/);
  assert.match(markdown, /useEffect\(\(\) => loadTheme\(\), \[\]\)/);
  assert.match(markdown, /## Practice task\nBuild a stable initial render\./);
  assert.match(markdown, /## Files changed\n- app\/theme\.tsx/);
  assert.match(markdown, /## Review questions/);
  assert.match(markdown, /\*\*Your answer:\*\* Because hydration reuses server HTML\./);
});

test("lessonToMarkdown handles missing optional fields without throwing", () => {
  const markdown = lessonToMarkdown(
    lesson({
      takeaway: undefined,
      mistakePattern: undefined,
      whenNotApplicable: undefined,
      codeExample: undefined,
      badCodeExample: undefined,
      goodCodeExample: undefined,
      codeExplanation: undefined,
      practiceTask: undefined,
      filesChanged: [],
      tags: [],
      reviewQuestions: [
        {
          id: "q1",
          question: "Why must initial renders match?",
          expectedAnswer: "Hydration reuses the server markup.",
          status: "unanswered",
        },
      ],
    }),
  );

  assert.match(markdown, /## Takeaway\n_Not captured\._/);
  assert.match(markdown, /## When this doesn't apply\n_Not captured\._/);
  assert.match(markdown, /## Practice task\n_Not captured\._/);
  assert.doesNotMatch(markdown, /## Code comparison/);
  assert.doesNotMatch(markdown, /## Files changed/);
  assert.doesNotMatch(markdown, /\*\*Tags:\*\*/);
  assert.match(markdown, /\*\*Your answer:\*\* \(not yet answered\)/);
});

test("lessonsToMarkdown joins multiple lessons with separators", () => {
  const markdown = lessonsToMarkdown([
    lesson(),
    lesson({ id: "lesson-2", title: "Second lesson" }),
  ]);
  const parts = markdown.split("\n\n---\n\n");
  assert.equal(parts.length, 2);
  assert.match(parts[0], /^# Hydration mismatch/);
  assert.match(parts[1], /^# Second lesson/);
});

test("lessonsToJson round-trips lessons", () => {
  const lessons = [lesson(), lesson({ id: "lesson-2", title: "Second lesson" })];
  const parsed = JSON.parse(lessonsToJson(lessons)) as Lesson[];
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].id, "lesson-1");
  assert.equal(parsed[1].title, "Second lesson");
});

test("lessonsToAnki emits one tab-separated note per review question", () => {
  const anki = lessonsToAnki([
    lesson({
      reviewQuestions: [
        {
          id: "q1",
          question: "Why must initial renders match?",
          expectedAnswer: "Hydration reuses the server markup.",
          status: "unanswered",
        },
        {
          id: "q2",
          question: "When is localStorage safe to read?",
          expectedAnswer: "After hydration, inside an effect.",
          status: "unanswered",
        },
      ],
    }),
  ]);

  const lines = anki.split("\n");
  assert.equal(lines[0], "#separator:Tab");
  assert.equal(lines[1], "#html:true");
  assert.equal(lines.length, 4);

  const firstNote = lines[2].split("\t");
  assert.equal(firstNote.length, 3);
  assert.equal(firstNote[0], "Why must initial renders match?");
  assert.match(firstNote[1], /Hydration reuses the server markup\./);
  assert.match(firstNote[1], /<b>Hydration mismatch<\/b>/);
  assert.match(firstNote[1], /Keep server and browser output identical/);
  assert.match(firstNote[1], /Scope: Does not apply to values that are identical/);
  assert.match(firstNote[2], /fixmind(?= |$)/);
  assert.match(firstNote[2], /Next\.js_hydration/);
  assert.match(firstNote[2], /Hydration_timing/);
  assert.match(firstNote[2], /fixmind-lesson-1/);

  const secondNote = lines[3].split("\t");
  assert.equal(secondNote[0], "When is localStorage safe to read?");
});

test("lessonsToAnki escapes newlines and returns nothing for empty input", () => {
  assert.equal(lessonsToAnki([]), "");

  const anki = lessonsToAnki([
    lesson({
      reviewQuestions: [
        {
          id: "q1",
          question: "Line one\nLine two",
          expectedAnswer: "Answer\nSecond line",
          status: "unanswered",
        },
      ],
    }),
  ]);
  const note = anki.split("\n")[2];
  assert.doesNotMatch(note, /\n/);
  assert.match(note, /Line one<br>Line two/);
  assert.match(note, /Answer<br>Second line/);
});

test("lessonsToAnki escapes user text before enabling html", () => {
  const anki = lessonsToAnki([
    lesson({
      title: "Use <main> & friends",
      takeaway: "Prefer <main> over a generic container & keep semantics.",
      reviewQuestions: [
        {
          id: "q1",
          question: "Why is <main> better than <div>?",
          expectedAnswer: "It gives assistive tools a <main> landmark & clearer structure.",
          status: "unanswered",
        },
      ],
    }),
  ]);

  const [front, back] = anki.split("\n")[2].split("\t");
  assert.equal(front, "Why is &lt;main&gt; better than &lt;div&gt;?");
  assert.match(back, /&lt;main&gt; landmark &amp; clearer structure/);
  assert.match(back, /<b>Use &lt;main&gt; &amp; friends<\/b>/);
  assert.doesNotMatch(back, /<main>/);
});
