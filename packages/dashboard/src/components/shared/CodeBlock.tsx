import { useMemo } from "react";
import hljs from "highlight.js/lib/core";
import type { DiffLine } from "@/lib/diff";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import { diffLines } from "@/lib/diff";
import { cn } from "./cn";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  css: "css",
  scss: "css",
  json: "json",
  html: "xml",
  htm: "xml",
  svg: "xml",
  xml: "xml",
};

// These grammars don't tokenize bare JSX tags on their own, so lines that
// look like a JSX/HTML element are highlighted with "xml" instead, which
// colors tag names, attributes, and attribute strings.
const JSX_CAPABLE_LANGS = new Set(["typescript", "javascript"]);
const JSX_TAG_PATTERN = /^<\/?[A-Za-z>]/;

function inferLanguage(filesChanged: string[]): string | undefined {
  for (const file of filesChanged) {
    const ext = file.split(".").pop()?.toLowerCase();
    if (ext && EXT_TO_LANG[ext]) return EXT_TO_LANG[ext];
  }
  return undefined;
}

function highlightLine(line: string, lang: string | undefined): string {
  const trimmed = line.trim();
  if (!trimmed) return "&nbsp;";
  if (lang && JSX_CAPABLE_LANGS.has(lang) && JSX_TAG_PATTERN.test(trimmed)) {
    return hljs.highlight(line, { language: "xml" }).value;
  }
  if (lang && hljs.getLanguage(lang)) {
    const candidates = JSX_CAPABLE_LANGS.has(lang) ? [lang, "xml"] : [lang];
    return hljs.highlightAuto(line, candidates).value;
  }
  return hljs.highlightAuto(line).value;
}

const BAD_MARK_CLASS = "bg-danger/30 rounded-sm";
const GOOD_MARK_CLASS = "bg-positive/30 rounded-sm";

function applyHighlightRanges(
  html: string,
  ranges: [number, number][],
  markClass: string,
): string {
  if (ranges.length === 0) return html;

  const container = document.createElement("div");
  container.innerHTML = html;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let totalLength = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
    totalLength += (node.textContent ?? "").length;
  }

  const changed = new Array<boolean>(totalLength).fill(false);
  for (const [start, end] of ranges) {
    for (let i = Math.max(0, start); i < Math.min(end, totalLength); i++)
      changed[i] = true;
  }

  let offset = 0;
  for (const textNode of textNodes) {
    const text = textNode.textContent ?? "";
    const pieces: Node[] = [];
    let i = 0;
    while (i < text.length) {
      const isChanged = changed[offset + i];
      let j = i + 1;
      while (j < text.length && changed[offset + j] === isChanged) j++;
      const chunk = text.slice(i, j);
      if (isChanged) {
        const mark = document.createElement("mark");
        mark.className = markClass;
        mark.textContent = chunk;
        pieces.push(mark);
      } else {
        pieces.push(document.createTextNode(chunk));
      }
      i = j;
    }
    offset += text.length;

    const parent = textNode.parentNode;
    if (!parent) continue;
    for (const piece of pieces) parent.insertBefore(piece, textNode);
    parent.removeChild(textNode);
  }

  return container.innerHTML;
}

function renderLine(
  line: DiffLine,
  lang: string | undefined,
  markClass: string,
): string {
  return applyHighlightRanges(
    highlightLine(line.text, lang),
    line.changedRanges,
    markClass,
  );
}

interface CodeBlockProps {
  value: string;
  compareWith?: string;
  kind: "bad" | "good";
  label: string;
  filesChanged?: string[];
}

export function CodeBlock({
  value,
  compareWith,
  kind,
  label,
  filesChanged = [],
}: CodeBlockProps) {
  const lang = useMemo(() => inferLanguage(filesChanged), [filesChanged]);

  const lines = useMemo<DiffLine[]>(() => {
    if (compareWith === undefined) {
      return value.split("\n").map((text) => ({ text, changedRanges: [] }));
    }
    const before = kind === "bad" ? value : compareWith;
    const after = kind === "bad" ? compareWith : value;
    return diffLines(before, after, kind);
  }, [value, compareWith, kind]);

  const markClass = kind === "bad" ? BAD_MARK_CLASS : GOOD_MARK_CLASS;

  return (
    <div className="overflow-hidden border border-line">
      <div
        className={cn(
          "border-b border-line px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[.2em]",
          kind === "bad" ? "text-danger" : "text-positive",
        )}
      >
        {label}
      </div>
      <pre className="m-0 h-full overflow-auto bg-surface py-2 font-mono text-xs leading-relaxed text-ink">
        {lines.map((line, index) => (
          <div
            key={index}
            className="px-4 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: renderLine(line, lang, markClass),
            }}
          />
        ))}
      </pre>
    </div>
  );
}
