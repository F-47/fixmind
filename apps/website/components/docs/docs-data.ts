import cliReferenceRaw from "@docs/cli-reference.md?raw";
import faqRaw from "@docs/faq.md?raw";
import lessonSchemaRaw from "@docs/lesson-schema.md?raw";
import mcpClientsRaw from "@docs/mcp-clients.md?raw";
import mcpIntegrationRaw from "@docs/mcp-integration.md?raw";
import quickstartRaw from "@docs/quickstart.md?raw";
import syncSetupRaw from "@docs/sync-setup.md?raw";
import { createElement, type ReactNode } from "react";

export type DocEntry = {
  id: string;
  title: string;
  content: string;
  summary: string;
  keywords: string[];
};

export type DocSection = {
  id: string;
  title: string;
  searchText: string;
  preview: string;
};

export type DocOutlineItem = {
  id: string;
  title: string;
  level: number;
};

export type SearchDoc = DocEntry & {
  searchText: string;
  sections: DocSection[];
};

export type SearchResult = {
  doc: SearchDoc;
  section: DocSection;
  score: number;
};

const LOW_SIGNAL_TERMS = new Set([
  "fixmind",
  "npx",
  "npm",
  "run",
  "use",
  "setup",
  "docs",
  "doc",
  "the",
  "and",
  "for",
  "with",
  "from",
  "to",
  "in",
  "on",
  "of",
]);

const BASE_DOCS: DocEntry[] = [
  {
    id: "quickstart",
    title: "Quickstart",
    summary: "Get Fixmind running in a few minutes.",
    keywords: ["setup", "install", "onboarding"],
    content: quickstartRaw,
  },
  {
    id: "mcp-integration",
    title: "MCP Integration",
    summary: "How the MCP server works and what it sends.",
    keywords: ["mcp", "server", "memory", "save_lesson"],
    content: mcpIntegrationRaw,
  },
  {
    id: "sync-setup",
    title: "Sync Setup",
    summary: "How Pro and Team users sign in and use sync.",
    keywords: ["sync", "login", "passphrase", "push", "pull"],
    content: syncSetupRaw,
  },
  {
    id: "mcp-clients",
    title: "MCP Clients",
    summary: "Manual setup notes for supported and other MCP clients.",
    keywords: ["claude", "codex", "cursor", "vscode", "opencode", "pi"],
    content: mcpClientsRaw,
  },
  {
    id: "commands",
    title: "Commands",
    summary: "Every CLI command, flag, and example.",
    keywords: ["cli", "flags", "setup", "review", "sync", "dashboard"],
    content: cliReferenceRaw,
  },
  {
    id: "lesson-schema",
    title: "Lesson Schema",
    summary: "What a lesson contains and how review works.",
    keywords: ["schema", "quality gate", "review", "supersede"],
    content: lessonSchemaRaw,
  },
  {
    id: "faq",
    title: "FAQ & Troubleshooting",
    summary: "Answers to the most common setup and sync questions.",
    keywords: ["help", "backup", "reset", "unavailable", "sync"],
    content: faqRaw,
  },
];

export const DOCS: SearchDoc[] = BASE_DOCS.map((doc) => ({
  ...doc,
  searchText: buildSearchText(doc),
  sections: buildDocSections(doc),
}));

export const DOC_FILENAME_TO_ID: Record<string, string> = {
  "quickstart.md": "quickstart",
  "sync-setup.md": "sync-setup",
  "mcp-integration.md": "mcp-integration",
  "mcp-clients.md": "mcp-clients",
  "cli-reference.md": "commands",
  "lesson-schema.md": "lesson-schema",
  "faq.md": "faq",
};

export function resolveDocLink(href: string): { docId: string; hash: string } | null {
  const match = /([^/]+\.md)(#.*)?$/i.exec(href);
  if (!match) return null;
  const docId = DOC_FILENAME_TO_ID[match[1].toLowerCase()];
  if (!docId) return null;
  return { docId, hash: match[2] ?? "" };
}

export function normalizeSearchQuery(query: string): string[] {
  return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

export function highlightText(text: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const terms = normalizeSearchQuery(trimmed);
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "ig");
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const key = `${part}-${index}`;
    if (terms.some((term) => part.toLowerCase() === term.toLowerCase())) {
      return createElement(
        "mark",
        {
          key,
          className:
            "rounded bg-accent px-1 text-bg ring-1 ring-accent/70 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]",
        },
        part,
      );
    }

    return createElement("span", { key }, part);
  });
}

export function searchDocs(query: string): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const terms = normalizeSearchQuery(trimmed);
  if (terms.length === 0) return [];

  const hasHighSignalTerm = terms.some((term) => !isLowSignalTerm(term));
  const minimumScore = hasHighSignalTerm ? 18 : 8;

  return DOCS.map((doc) => selectSectionMatch(doc, terms))
    .filter((result) => result.score >= minimumScore)
    .sort((a, b) => b.score - a.score);
}

export function extractDocOutline(content: string): DocOutlineItem[] {
  const outline: DocOutlineItem[] = [];

  for (const line of content.split(/\r?\n/)) {
    const match = /^(##)\s+(.+)$/.exec(line);
    if (!match) continue;

    const title = match[2].trim();
    outline.push({
      id: outlineSlugify(title),
      title,
      level: match[1].length,
    });
  }

  return outline;
}

function outlineSlugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`"'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildSearchText(doc: DocEntry): string {
  const withoutCode = doc.content.replace(/```[\s\S]*?```/g, " ").replace(/`([^`]+)`/g, "$1");
  const headings = Array.from(withoutCode.matchAll(/^#{1,3}\s+(.+)$/gm), (match) => match[1]).join(
    " ",
  );
  return `${doc.title} ${doc.summary} ${doc.keywords.join(" ")} ${headings} ${withoutCode}`.toLowerCase();
}

function buildDocSections(doc: DocEntry): DocSection[] {
  const lines = doc.content.split(/\r?\n/);
  const sections: DocSection[] = [];
  let currentTitle = doc.title;
  let currentLines: string[] = [];

  const flush = () => {
    const rawContent = currentLines.join("\n").trim();
    if (!rawContent && sections.length > 0) return;

    const cleanContent = normalizeDocText(rawContent || doc.summary);
    const headingSlug = slugify(currentTitle);
    sections.push({
      id: headingSlug,
      title: currentTitle,
      searchText: `${doc.title} ${currentTitle} ${cleanContent}`.toLowerCase(),
      preview: cleanContent,
    });
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flush();
      currentTitle = headingMatch[2].trim();
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  flush();

  return sections.length > 0
    ? sections
    : [
        {
          id: slugify(doc.title),
          title: doc.title,
          searchText: `${doc.title} ${doc.summary} ${doc.content}`.toLowerCase(),
          preview: doc.summary,
        },
      ];
}

function selectSectionMatch(doc: SearchDoc, terms: string[]): SearchResult {
  const ranked = doc.sections
    .map((section) => ({ section, score: scoreSection(section, terms) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  return {
    doc,
    section: best && best.score > 0 ? best.section : doc.sections[0],
    score: best && best.score > 0 ? scoreDoc(doc, terms) + best.score : scoreDoc(doc, terms),
  };
}

function scoreDoc(doc: SearchDoc, terms: string[]): number {
  if (terms.length === 0) return 0;

  const title = doc.title.toLowerCase();
  const summary = doc.summary.toLowerCase();
  const keywords = doc.keywords.map((keyword) => keyword.toLowerCase());
  let score = 0;

  for (const term of terms) {
    const lowSignal = isLowSignalTerm(term);
    const titleBonus = lowSignal ? 12 : 18;
    const summaryBonus = lowSignal ? 6 : 10;
    const searchTextBonus = lowSignal ? 1 : 4;

    score += scoreText(title, term, {
      exactBonus: titleBonus,
      prefixBonus: lowSignal ? 4 : 8,
      allowSubstring: false,
    });
    score += scoreText(summary, term, {
      exactBonus: summaryBonus,
      prefixBonus: lowSignal ? 2 : 3,
      allowSubstring: false,
    });
    score += scoreKeywords(keywords, term) * (lowSignal ? 0.7 : 1);
    score +=
      scoreText(doc.searchText, term, {
        exactBonus: searchTextBonus,
        prefixBonus: 1,
        allowSubstring: term.length >= 5,
      }) * (lowSignal ? 0.4 : 1);
  }

  if (terms.every((term) => hasWholeWord(doc.searchText, term))) {
    score += 10;
  }

  return score;
}

function scoreSection(section: DocSection, terms: string[]): number {
  if (terms.length === 0) return 0;

  const title = section.title.toLowerCase();
  let score = 0;

  for (const term of terms) {
    const lowSignal = isLowSignalTerm(term);
    score += scoreText(title, term, {
      exactBonus: lowSignal ? 14 : 20,
      prefixBonus: lowSignal ? 5 : 8,
      allowSubstring: false,
    });
    score +=
      scoreText(section.searchText, term, {
        exactBonus: lowSignal ? 3 : 6,
        prefixBonus: lowSignal ? 1 : 2,
        allowSubstring: term.length >= 5,
      }) * (lowSignal ? 0.5 : 1);
  }

  if (terms.every((term) => hasWholeWord(section.searchText, term))) {
    score += 10;
  }

  return score;
}

function normalizeDocText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`"'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreText(
  text: string,
  term: string,
  options: { exactBonus: number; prefixBonus: number; allowSubstring: boolean },
): number {
  if (!term) return 0;

  const normalized = text.toLowerCase();
  const exact = normalized === term;
  const prefix = normalized.startsWith(term);
  const wholeWordCount = countWholeWordMatches(normalized, term);

  if (exact) return options.exactBonus + 6;

  let score = 0;
  if (prefix) score += options.prefixBonus;
  if (wholeWordCount > 0) score += options.exactBonus + Math.min(wholeWordCount - 1, 2);
  if (score === 0 && options.allowSubstring && normalized.includes(term)) {
    score += 1;
  }

  return score;
}

function scoreKeywords(keywords: string[], term: string): number {
  let score = 0;
  for (const keyword of keywords) {
    if (keyword === term) {
      score += 14;
      continue;
    }

    if (keyword.startsWith(term)) {
      score += 8;
      continue;
    }

    if (hasWholeWord(keyword, term)) {
      score += 10;
    }
  }
  return score;
}

function hasWholeWord(text: string, term: string): boolean {
  if (!term) return false;
  const pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
  return pattern.test(text);
}

function countWholeWordMatches(text: string, term: string): number {
  if (!term) return 0;
  const pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, "gi");
  return text.match(pattern)?.length ?? 0;
}

function isLowSignalTerm(term: string): boolean {
  return term.length <= 2 || LOW_SIGNAL_TERMS.has(term);
}
