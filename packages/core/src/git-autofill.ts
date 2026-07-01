import type { GitContext } from "./git.js";

export interface GitAutofill {
  filesChanged: string[];
  concepts: string[];
  mistakePattern?: string;
  codeExample?: string;
}

interface PatternRule {
  pattern: RegExp;
  mistakePattern: string;
  concepts: string[];
}

const PATTERN_RULES: PatternRule[] = [
  {
    pattern: /(localstorage|hydration|server-side rendering|browser-only|document\.|window\.)/i,
    mistakePattern: "Hydration timing",
    concepts: ["Hydration", "SSR"],
  },
  {
    pattern: /(async|await|promise|race condition|out of order|concurrent|cancel|abort)/i,
    mistakePattern: "Async timing",
    concepts: ["Async control flow", "Race conditions"],
  },
  {
    pattern: /(stale closure|dependency array|latest value|closed over|effect)/i,
    mistakePattern: "Stale closure",
    concepts: ["React hooks", "Dependencies"],
  },
  {
    pattern: /(slice|pagination|page size|offset|off-by-one|inclusive|exclusive|end index)/i,
    mistakePattern: "Off-by-one",
    concepts: ["Boundaries", "Pagination"],
  },
  {
    pattern: /(null|undefined|optional|missing value|guard)/i,
    mistakePattern: "Null guard",
    concepts: ["Nullability", "Guard clauses"],
  },
  {
    pattern: /(overlay|z-index|pointer events|unclickable|stacking context)/i,
    mistakePattern: "Stacking context",
    concepts: ["CSS stacking", "Pointer events"],
  },
  {
    pattern: /(validation|required field|schema|trust(ed)? the form|input validation)/i,
    mistakePattern: "Input validation",
    concepts: ["Validation", "Form data"],
  },
  {
    pattern: /(server-only|client component|runtime boundary|node-only|package boundary)/i,
    mistakePattern: "Wrong runtime boundary",
    concepts: ["Client/server boundary", "Runtime split"],
  },
];

export function buildGitAutofill(git: GitContext): GitAutofill {
  const text = [git.filesChanged.join(" "), git.sourceDiff ?? ""].join("\n");
  const rule = PATTERN_RULES.find((candidate) => candidate.pattern.test(text));

  return {
    filesChanged: git.filesChanged,
    concepts: rule ? rule.concepts : [],
    mistakePattern: rule?.mistakePattern,
    codeExample: extractCodeExample(git.sourceDiff),
  };
}

function extractCodeExample(sourceDiff?: string): string | undefined {
  if (!sourceDiff) return undefined;

  const lines = sourceDiff.split(/\r?\n/);
  const snippet: string[] = [];
  let inFirstHunk = false;
  let sawAddition = false;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      if (inFirstHunk && snippet.length > 0) break;
      continue;
    }
    if (line.startsWith("@@")) {
      if (inFirstHunk && snippet.length > 0) break;
      inFirstHunk = true;
      continue;
    }
    if (!inFirstHunk) continue;
    if (line.startsWith("--- ") || line.startsWith("+++ ") || line.startsWith("index ")) continue;
    if (line.startsWith("\\ No newline")) continue;
    if (line.startsWith("-")) continue;
    if (line.startsWith("+")) {
      sawAddition = true;
      snippet.push(line.slice(1));
    } else if (line.startsWith(" ")) {
      snippet.push(line.slice(1));
    }
    if (snippet.length >= 10) break;
  }

  const cleaned = trimBlankEdges(snippet);
  if (!sawAddition || cleaned.length < 2) return undefined;
  return cleaned.join("\n");
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  return lines.slice(start, end);
}
