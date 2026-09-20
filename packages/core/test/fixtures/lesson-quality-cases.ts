import type { LessonInput } from "../../src/types.js";

export type ExpectedVerdict = "pass" | "warn" | "reject";

export interface LessonQualityCase {
  name: string;
  expect: ExpectedVerdict;
  /** For "reject"/"warn": at least one error/warning must match this pattern. */
  reasonPattern?: RegExp;
  input: LessonInput;
}

/**
 * Calibration set of realistic lesson submissions, each labeled with the
 * verdict assessLessonQuality should produce. Used both as a regression
 * suite (test/validation.test.ts) and as a reference for what "good" vs
 * "shallow" vs "mechanical" looks like in practice.
 */
export const lessonQualityCases: LessonQualityCase[] = [
  {
    name: "strong real bug fix: theme flash + hydration mismatch from reading localStorage during SSR",
    expect: "pass",
    input: {
      title: "Fix theme flash from reading localStorage during SSR",
      problem:
        "On first load the page briefly flashed the light theme before snapping to dark, and React logged a hydration mismatch warning.",
      mistake:
        "Read localStorage to pick the initial theme while the component was still rendering on the server.",
      rootCause:
        "localStorage does not exist on the server, so the server always renders the default theme while the client immediately renders the stored theme, producing two different outputs for the same markup.",
      fixSummary:
        "Render the default theme on the server and read localStorage inside a useEffect after mount, so the markup matches on both server and client before the theme is corrected.",
      takeaway:
        "Never read browser-only storage during the initial render - read it after mount instead.",
      whenNotApplicable:
        "Does not apply to values that are guaranteed to be identical on server and client, like a static default theme with no persisted preference.",
      concepts: ["hydration", "useEffect"],
      badCodeExample:
        "const [theme, setTheme] = useState(localStorage.getItem('theme') ?? 'light')",
      goodCodeExample:
        "const [theme, setTheme] = useState('light')\nuseEffect(() => {\n  const stored = localStorage.getItem('theme')\n  if (stored) setTheme(stored)\n}, [])",
      reviewQuestions: [
        {
          question:
            "A teammate wants to read the user's saved sidebar width on first render to avoid a layout shift. What problem will they hit, and how should they structure the code instead?",
          expectedAnswer:
            "The same hydration mismatch: the server has no localStorage, so it would render a default width while the client renders the saved one. They should render the default width on the server and apply the saved width inside a useEffect after mount.",
        },
      ],
    },
  },
  {
    name: "mechanical refactor: extracted date helpers into a new file with no behavior change",
    expect: "reject",
    reasonPattern: /mechanical/i,
    input: {
      title: "Extract date formatting helpers",
      problem: "The cli.ts file had grown too large and mixed unrelated concerns.",
      mistake:
        "Moved formatDate and parseDate out of cli.ts into a new date-utils.ts file without changing their implementation.",
      rootCause:
        "The helpers were defined inline in cli.ts alongside unrelated CLI argument parsing.",
      fixSummary:
        "Extracted formatDate and parseDate into src/date-utils.ts and imported them from cli.ts.",
      takeaway:
        "Group reusable date-formatting helpers in their own module for easier reuse and testing.",
      whenNotApplicable:
        "Does not apply to helpers that are only used in one file - inlining is fine there.",
      concepts: ["code organization"],
      reviewQuestions: [
        {
          question:
            "If you find a helper used by three different CLI commands, where should it live and why?",
          expectedAnswer:
            "In its own shared module, so each command imports the same implementation instead of duplicating it.",
        },
      ],
    },
  },
  {
    name: "UI-only change: button padding tweak with no behavior change",
    expect: "reject",
    reasonPattern: /UI-only|styling/i,
    input: {
      title: "Increase button padding on small screens",
      problem: "The primary button looked cramped on mobile screens compared to the design spec.",
      mistake:
        "Used a fixed 8px padding on the button for all screen sizes instead of the 12px the design spec calls for on small screens.",
      rootCause:
        "The button's className hardcoded padding-2 instead of a responsive padding utility.",
      fixSummary:
        "Changed the button's className to use padding-3 on small screens, matching the design spec.",
      takeaway: "Match spacing values to the design spec's breakpoints, not a single fixed value.",
      whenNotApplicable:
        "Does not apply once the design system defines a single padding scale that already matches the spec at every breakpoint.",
      concepts: ["styling", "tailwind"],
      reviewQuestions: [
        {
          question:
            "A different component hardcodes a 16px margin regardless of screen size. What should you check before assuming that's correct?",
          expectedAnswer:
            "Check whether the design spec defines different spacing per breakpoint, since a single hardcoded value may not match the spec on other screen sizes.",
        },
      ],
    },
  },
  {
    name: "vague lesson: every field is generic boilerplate",
    expect: "reject",
    reasonPattern: /generic placeholder/i,
    input: {
      title: "Fix login bug",
      problem: "Login was broken for some users.",
      mistake: "The code was wrong.",
      rootCause: "There was a bug in the logic.",
      fixSummary: "Fixed the bug.",
      takeaway: "Be more careful with the code.",
      whenNotApplicable: "Not sure.",
      concepts: ["bugfix"],
      reviewQuestions: [
        {
          question: "What did you change to fix the login bug?",
          expectedAnswer: "Fixed the logic that was wrong.",
        },
      ],
    },
  },
  {
    name: "shallow root cause: rootCause is mostly a reshuffling of mistake's wording",
    expect: "warn",
    reasonPattern: /rootCause/i,
    input: {
      title: "Null check missing before rendering profile",
      problem:
        "The profile page crashed with 'Cannot read properties of null' when a user had no avatar set.",
      mistake:
        "Rendered the profile page by accessing user.avatar.url before checking whether user.avatar was null.",
      rootCause: "Accessed user.avatar.url before checking whether user.avatar was null.",
      fixSummary:
        "Added a check for user.avatar before reading .url, so the page falls back to a placeholder instead of crashing when no avatar is set.",
      takeaway: "Guard optional nested fields before accessing their properties.",
      whenNotApplicable: "Does not apply when the schema guarantees avatar is always present.",
      concepts: ["null safety"],
      reviewQuestions: [
        {
          question:
            "A settings page reads user.preferences.theme the same way. What should you check before assuming preferences.theme is safe to access?",
          expectedAnswer:
            "Whether preferences (or theme) can be null/undefined for some users, and guard the access the same way - check the parent before reading its property.",
        },
      ],
    },
  },
  {
    name: "no transfer value: the only review question asks what changed",
    expect: "reject",
    reasonPattern: /transfer/i,
    input: {
      title: "Off-by-one when paginating results",
      problem: "The last item on each page was missing from the results list.",
      mistake: "Used array.slice(start, start + pageSize - 1) to get a page of results.",
      rootCause:
        "slice's end index is exclusive, so subtracting 1 drops the last element of every page instead of including it.",
      fixSummary:
        "Changed the slice call to array.slice(start, start + pageSize), since slice already excludes the end index.",
      takeaway:
        "Remember that Array.prototype.slice's end argument is exclusive - don't subtract 1 from it.",
      whenNotApplicable:
        "Does not apply to APIs whose end index is inclusive, like some libraries' substring helpers.",
      concepts: ["pagination", "Array.slice"],
      badCodeExample: "items.slice(start, start + pageSize - 1)",
      goodCodeExample: "items.slice(start, start + pageSize)",
      reviewQuestions: [
        {
          question: "What did you change to fix the pagination bug?",
          expectedAnswer: "Removed the '- 1' from the slice end index.",
        },
      ],
    },
  },
  {
    name: "patch-description fixSummary: describes the edit but not why it fixes the root cause",
    expect: "warn",
    reasonPattern: /why|patch/i,
    input: {
      title: "Crash when API returns null for an optional field",
      problem:
        "The orders page crashed with 'Cannot read properties of null (reading map)' for orders with no line items.",
      mistake:
        "Called response.lineItems.map(...) assuming the API always returns an array for lineItems.",
      rootCause:
        "The API returns null for lineItems when an order has no items, instead of an empty array, so .map() is called on null.",
      fixSummary: "Added a fallback to an empty array before calling .map() on lineItems.",
      takeaway:
        "Treat API fields documented as arrays as possibly null, and default to an empty array before iterating.",
      whenNotApplicable:
        "Does not apply to fields the API contract guarantees are always a non-null array.",
      concepts: ["null safety", "API contracts"],
      badCodeExample: "response.lineItems.map((item) => item.sku)",
      goodCodeExample: "(response.lineItems ?? []).map((item) => item.sku)",
      reviewQuestions: [
        {
          question:
            "Another endpoint documents 'tags: string[]' but sometimes returns null. A teammate writes tags.map(...) directly. What will happen, and what should they check for any field documented as an array?",
          expectedAnswer:
            "It will crash the same way when tags is null, because .map() doesn't exist on null. They should default to an empty array (e.g. (tags ?? []).map(...)) for any field whose real-world API responses can be null even if the docs say array.",
        },
      ],
    },
  },
  {
    name: "real fix described with move/refactor wording: useEffect dependency array causing an infinite fetch loop",
    expect: "warn",
    reasonPattern: /code examples/i,
    input: {
      title: "Fix infinite refetch loop from a useEffect with no dependency array",
      problem:
        "The product list page fired the same API request in an infinite loop, freezing the tab.",
      mistake:
        "Moved the product fetch into a useEffect with no dependency array, so it ran after every render instead of only when the filters changed.",
      rootCause:
        "A useEffect with no dependency array runs after every render, and each fetch updated state, which triggered another render and another fetch, creating an infinite loop.",
      fixSummary:
        "Refactored the effect to depend on [filters], so it only refetches when the filter values actually change instead of on every render.",
      takeaway:
        "An effect with no dependency array re-runs after every render - give it a dependency array that reflects what it actually depends on.",
      whenNotApplicable:
        "Does not apply to effects that are meant to run on every render, like syncing a ref to the latest prop value.",
      concepts: ["useEffect", "dependency array"],
      filesChanged: ["src/components/ProductList.tsx"],
      reviewQuestions: [
        {
          question:
            "A search box's useEffect calls an analytics API and has no dependency array. What will happen as the user types, and how should the effect be written instead?",
          expectedAnswer:
            "It will fire on every render - including every keystroke-triggered render - causing a flood of analytics calls. It should depend on the search term (or be debounced) so it only fires when that value actually changes.",
        },
      ],
    },
  },
  {
    name: "real fix using styling vocabulary but describing a real interaction bug: overlay made a button unclickable",
    expect: "pass",
    input: {
      title: "Fix unclickable save button caused by an overlapping overlay",
      problem:
        "The 'Save' button on the settings page became unclickable - clicking anywhere on it had no effect.",
      mistake:
        "Gave a decorative overlay div a higher z-index in its className than the button beneath it, assuming styling order in the stylesheet (not z-index) controlled which element received clicks.",
      rootCause:
        "An element with a higher z-index sits above elements behind it in the stacking order and intercepts pointer events meant for them, regardless of the order styles are declared in the CSS.",
      fixSummary:
        "Lowered the overlay's z-index below the button's in its className, so click events reach the button instead of being captured by the overlay.",
      takeaway:
        "A higher z-index element intercepts clicks meant for elements behind it - check stacking order, not just CSS declaration order, when something becomes unclickable.",
      whenNotApplicable:
        "Does not apply when the overlay is meant to block interaction with the content behind it, like a modal backdrop.",
      concepts: ["z-index", "stacking context", "pointer events"],
      badCodeExample:
        '<div className="overlay z-50" />\n<button className="save-button z-10">Save</button>',
      goodCodeExample:
        '<div className="overlay z-0" />\n<button className="save-button z-10">Save</button>',
      reviewQuestions: [
        {
          question:
            "A teammate adds a full-page loading spinner with a high z-index, and afterward a modal's close button stops responding to clicks even though the spinner is hidden. What's the likely cause, and what would you check?",
          expectedAnswer:
            "The hidden spinner (or its container) may still be in the DOM with a z-index above the modal, intercepting clicks even while visually hidden. Check whether the element is actually removed/display:none, and compare z-index/stacking order against the modal.",
        },
      ],
    },
  },
  {
    name: "fixSummary starts with boilerplate 'fixed the bug' phrasing but explains the real mechanism",
    expect: "pass",
    input: {
      title: "Fix off-by-one when paginating results",
      problem: "The last item on each page of search results was missing.",
      mistake:
        "Used array.slice(start, start + pageSize - 1) to get a page of results, assuming slice's end index was inclusive.",
      rootCause:
        "Array.prototype.slice's end index is exclusive, so subtracting 1 from it drops the last element of every page instead of including it.",
      fixSummary:
        "Fixed the bug by changing the slice call to array.slice(start, start + pageSize), because slice already excludes its end index so no extra subtraction is needed.",
      takeaway: "Array.prototype.slice's end argument is exclusive - don't subtract 1 from it.",
      whenNotApplicable:
        "Does not apply to APIs whose end index is inclusive, like some libraries' substring helpers.",
      concepts: ["pagination", "Array.slice"],
      badCodeExample: "items.slice(start, start + pageSize - 1)",
      goodCodeExample: "items.slice(start, start + pageSize)",
      reviewQuestions: [
        {
          question:
            "A teammate writes `text.substring(start, end - 1)` assuming substring's end is inclusive like slice. Is that assumption correct, and what would happen?",
          expectedAnswer:
            "No - substring's end index is also exclusive, like slice's. Subtracting 1 would drop the last character of the range for the same reason this pagination bug dropped the last item.",
        },
      ],
    },
  },
  {
    name: "no transfer value: the only review question asks how the bug was fixed",
    expect: "reject",
    reasonPattern: /transfer/i,
    input: {
      title: "Crash when rendering a user with no avatar",
      problem:
        "The profile page crashed with 'Cannot read properties of null (reading url)' for users who never uploaded an avatar.",
      mistake: "Rendered <img src={user.avatar.url}> assuming user.avatar was always an object.",
      rootCause:
        "Accounts created before avatar uploads existed have user.avatar set to null instead of a placeholder object, so .url is read from null.",
      fixSummary:
        "Render a placeholder image when user.avatar is null, since accessing .url on null throws before the fallback can run.",
      takeaway:
        "Treat optional nested objects as possibly null and guard before accessing their properties.",
      whenNotApplicable:
        "Does not apply once the backend guarantees avatar is always populated with at least a default object.",
      concepts: ["null safety"],
      badCodeExample: "<img src={user.avatar.url} />",
      goodCodeExample: "<img src={user.avatar?.url ?? '/default-avatar.png'} />",
      reviewQuestions: [
        {
          question: "How did you fix this bug?",
          expectedAnswer: "Added a fallback to a placeholder image when user.avatar is null.",
        },
      ],
    },
  },
  {
    name: "short but specific lesson should not be falsely rejected",
    expect: "pass",
    input: {
      title: "Date equality check always false",
      problem: "Two dates that represented the same moment were treated as different in the UI.",
      mistake: "Compared two Date objects directly with ==.",
      rootCause:
        "== compares Date objects by reference, not by value, so two distinct Date instances are never equal even if they represent the same moment.",
      fixSummary:
        "Compared the dates with .getTime() instead, since that compares the underlying timestamps by value.",
      takeaway: "Compare Date objects with .getTime(), not == or ===.",
      whenNotApplicable: "Does not apply when comparing the exact same Date instance to itself.",
      concepts: ["Date", "equality"],
      badCodeExample: "if (dateA == dateB) { /* ... */ }",
      goodCodeExample: "if (dateA.getTime() === dateB.getTime()) { /* ... */ }",
      reviewQuestions: [
        {
          question:
            "A teammate writes `if (objA == objB)` to compare two plain objects with the same keys/values. Will this work, and why or why not?",
          expectedAnswer:
            "No - like Dates, plain objects are compared by reference with ==, so two different objects with identical contents are never equal. They'd need a deep-equality check instead.",
        },
      ],
    },
  },
];
