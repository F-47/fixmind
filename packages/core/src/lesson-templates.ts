import type { LessonInput } from "./types.js";

type LessonTemplateDefaults = Pick<
  LessonInput,
  | "title"
  | "originalPrompt"
  | "problem"
  | "mistake"
  | "rootCause"
  | "fixSummary"
  | "takeaway"
  | "mistakePattern"
  | "whenNotApplicable"
  | "concepts"
>;

export interface LessonTemplate {
  id: string;
  label: string;
  description: string;
  prompt: string;
  defaults: LessonTemplateDefaults;
  reviewQuestion: {
    question: string;
    expectedAnswer: string;
  };
}

const ARCHITECTURE_BOUNDARY_TEMPLATE: LessonTemplate = {
  id: "architecture-boundary",
  label: "Architecture boundary",
  description: "Use when code crosses a client/server, app/runtime, or package boundary.",
  prompt: "Explain where each side runs, what belongs in each bundle or process, and which supported API boundary the fix uses.",
  defaults: {
    title: "Architecture boundary mistake",
    originalPrompt: "",
    problem: "The browser path tried to use code that only works on the server.",
    mistake: "The code assumed the same dependency could run in both runtimes.",
    rootCause: "The runtime boundary was wrong: client code cannot execute server-only logic, so the import failed before the UI could recover.",
    fixSummary: "Move the browser to the supported client-facing API and keep the server-only code on the backend.",
    takeaway: "Match the dependency to the runtime boundary before you wire the import.",
    mistakePattern: "Wrong runtime boundary",
    whenNotApplicable: "Does not apply when the dependency is explicitly supported in the client bundle.",
    concepts: ["Client/server boundary", "Runtime split"],
  },
  reviewQuestion: {
    question: "A teammate imports a server-only package into a client component. What should they change?",
    expectedAnswer: "Keep the server-only code on the backend and use the supported client-facing API in the browser.",
  },
};

const STALE_STATE_TEMPLATE: LessonTemplate = {
  id: "stale-state",
  label: "Stale state",
  description: "Use when a render, effect, or callback kept an old snapshot of state or props.",
  prompt: "Explain which value went stale, why it stopped updating, and which dependency or lifecycle keeps it current.",
  defaults: {
    title: "Stale state bug",
    originalPrompt: "",
    problem: "The UI kept showing an old value after the source state changed.",
    mistake: "The code captured a snapshot and kept reusing it after the source changed.",
    rootCause: "The callback or effect closed over an old render, so later updates never reached the code that made the decision.",
    fixSummary: "Read the current value at the right lifecycle point and keep the dependency list aligned with the inputs.",
    takeaway: "When a value can change, make the code read the current value instead of a frozen copy.",
    mistakePattern: "Stale state",
    whenNotApplicable: "Does not apply when the value is truly constant for the lifetime of the component.",
    concepts: ["React state", "Effects"],
  },
  reviewQuestion: {
    question: "A callback keeps using an older value after state changes. What should the developer check first?",
    expectedAnswer: "They should check which render the callback captured and whether the dependency list or lifecycle keeps the value current.",
  },
};

const ASYNC_TIMING_TEMPLATE: LessonTemplate = {
  id: "async-timing",
  label: "Async timing",
  description: "Use when requests, promises, or events complete out of order.",
  prompt: "Explain which result arrived late, why the older value won, and how cancellation or sequencing prevents the race.",
  defaults: {
    title: "Async timing bug",
    originalPrompt: "",
    problem: "An older async result overwrote the newer state.",
    mistake: "The code assumed requests would finish in the same order they started.",
    rootCause: "The slow response was still allowed to write after a newer request had already started, so stale data won the race.",
    fixSummary: "Track the active request and ignore or cancel stale responses before they can write state.",
    takeaway: "When async work can overlap, guard the write as carefully as the read.",
    mistakePattern: "Async race",
    whenNotApplicable: "Does not apply when only one request can be in flight at a time.",
    concepts: ["Promises", "Race conditions"],
  },
  reviewQuestion: {
    question: "A slower earlier request finishes after a faster later one. What should happen?",
    expectedAnswer: "The stale response should be ignored or cancelled so it cannot overwrite the newer result.",
  },
};

const OFF_BY_ONE_TEMPLATE: LessonTemplate = {
  id: "off-by-one",
  label: "Off-by-one",
  description: "Use when an index, slice, count, or boundary was one step too far or too short.",
  prompt: "Name the boundary convention, show which endpoint is inclusive or exclusive, and explain why one element was dropped or duplicated.",
  defaults: {
    title: "Off-by-one boundary bug",
    originalPrompt: "",
    problem: "The last item disappeared from the list or page.",
    mistake: "The code mixed inclusive and exclusive boundaries.",
    rootCause: "The loop or slice endpoint was one step short or long, so the final element was dropped or repeated.",
    fixSummary: "Use one boundary convention end-to-end and calculate the endpoint from the same count.",
    takeaway: "Decide whether the endpoint is inclusive or exclusive before you write the loop.",
    mistakePattern: "Off-by-one",
    whenNotApplicable: "Does not apply when the API itself defines the boundary for you.",
    concepts: ["Index boundaries", "Pagination"],
  },
  reviewQuestion: {
    question: "A teammate drops the last item when paginating a list. What boundary question should they answer first?",
    expectedAnswer: "They should decide whether the API uses an inclusive or exclusive endpoint and make the count match that convention.",
  },
};

const NULL_GUARD_TEMPLATE: LessonTemplate = {
  id: "null-guard",
  label: "Null guard",
  description: "Use when a value, prop, or record can be missing and the code assumed it was always present.",
  prompt: "Explain which contract allowed the value to be absent and where the fallback should live before the code touches nested fields.",
  defaults: {
    title: "Missing null guard",
    originalPrompt: "",
    problem: "The view crashed when an optional value was missing.",
    mistake: "The code assumed the value was always populated.",
    rootCause: "The data source legitimately returned null or undefined, so dereferencing it threw before the fallback could render.",
    fixSummary: "Check the contract, return a fallback, and only access nested fields after the guard.",
    takeaway: "Guard the value at the boundary where it can become absent.",
    mistakePattern: "Missing guard",
    whenNotApplicable: "Does not apply when the schema guarantees the value is always present.",
    concepts: ["Nullability", "Defensive UI"],
  },
  reviewQuestion: {
    question: "An optional record can be missing in a different component. What should the code do before reading nested fields?",
    expectedAnswer: "It should guard the missing case first and render a fallback or return early before dereferencing anything.",
  },
};

export const LESSON_TEMPLATES: LessonTemplate[] = [
  ARCHITECTURE_BOUNDARY_TEMPLATE,
  STALE_STATE_TEMPLATE,
  ASYNC_TIMING_TEMPLATE,
  OFF_BY_ONE_TEMPLATE,
  NULL_GUARD_TEMPLATE,
];

export function getLessonTemplate(templateId: string): LessonTemplate | undefined {
  return LESSON_TEMPLATES.find((template) => template.id === templateId);
}

export function lessonTemplateOptions(): Array<{ value: string; label: string; hint: string }> {
  return [
    {
      value: "",
      label: "Blank",
      hint: "Start from scratch and fill in your own lesson shape.",
    },
    ...LESSON_TEMPLATES.map((template) => ({
      value: template.id,
      label: template.label,
      hint: template.description,
    })),
  ];
}

export function formatLessonTemplatePrompts(): string {
  return LESSON_TEMPLATES
    .map((template) => `- ${template.label}: ${template.prompt}`)
    .join("\n");
}
