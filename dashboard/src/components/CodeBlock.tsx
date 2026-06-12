import { useEffect, useRef } from "react";
import hljs from "highlight.js/lib/core";
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
  ts: "typescript", tsx: "typescript",
  js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  sh: "bash", bash: "bash", zsh: "bash",
  css: "css", scss: "css",
  json: "json",
  html: "xml", htm: "xml", svg: "xml", xml: "xml",
};

function inferLanguage(filesChanged: string[]): string | undefined {
  for (const file of filesChanged) {
    const ext = file.split(".").pop()?.toLowerCase();
    if (ext && EXT_TO_LANG[ext]) return EXT_TO_LANG[ext];
  }
  return undefined;
}

interface CodeBlockProps {
  value: string;
  kind: "bad" | "good";
  label: string;
  filesChanged?: string[];
}

export function CodeBlock({ value, kind, label, filesChanged = [] }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = codeRef.current;
    if (!el) return;
    const lang = inferLanguage(filesChanged);
    if (lang && hljs.getLanguage(lang)) {
      el.innerHTML = hljs.highlight(value, { language: lang }).value;
    } else {
      el.innerHTML = hljs.highlightAuto(value).value;
    }
  }, [value, filesChanged]);

  return (
    <div className="overflow-hidden border border-line">
      <div className={`border-b border-line px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[.2em] ${kind === "bad" ? "text-danger" : "text-positive"}`}>
        {label}
      </div>
      <pre className="m-0 overflow-auto bg-surface p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink">
        <code ref={codeRef} />
      </pre>
    </div>
  );
}
