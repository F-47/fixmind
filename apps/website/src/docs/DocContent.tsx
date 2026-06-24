import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import type { NavigateFunction } from "react-router-dom";
import { CommandSnippet } from "../components/CommandSnippet";
import { highlightText, normalizeSearchQuery } from "./docs-data";
import { resolveDocLink } from "./docs-data";

type DocContentProps = {
  content: string;
  navigate: NavigateFunction;
  highlightQuery: string;
};

export function DocContent({ content, navigate, highlightQuery }: DocContentProps) {
  const searchTerms = normalizeSearchQuery(highlightQuery);

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug]}
      components={{
        h1: ({ node, children, ...props }) => (
          <h1
            className="mb-8 mt-2 scroll-mt-36 font-display text-3xl font-semibold tracking-tight text-ink first:mt-0 sm:text-4xl"
            {...props}
          >
            {renderHighlightedChildren(children, searchTerms)}
          </h1>
        ),
        h2: ({ node, children, ...props }) => (
          <h2
            className="mb-6 mt-12 scroll-mt-36 border-b border-line pb-2 font-display text-2xl font-semibold tracking-tight text-ink"
            {...props}
          >
            {renderHighlightedChildren(children, searchTerms)}
          </h2>
        ),
        h3: ({ node, children, ...props }) => (
          <h3 className="mb-4 mt-8 scroll-mt-36 font-display text-xl font-medium text-ink" {...props}>
            {renderHighlightedChildren(children, searchTerms)}
          </h3>
        ),
        p: ({ node, children, ...props }) => (
          <p className="mb-5 leading-relaxed text-muted" {...props}>
            {renderHighlightedChildren(children, searchTerms)}
          </p>
        ),
        ul: ({ node, children, ...props }) => (
          <ul className="mb-6 list-disc space-y-2 pl-6 text-muted" {...props}>
            {renderHighlightedChildren(children, searchTerms)}
          </ul>
        ),
        ol: ({ node, children, ...props }) => (
          <ol className="mb-6 list-decimal space-y-2 pl-6 text-muted" {...props}>
            {renderHighlightedChildren(children, searchTerms)}
          </ol>
        ),
        li: ({ node, children, ...props }) => (
          <li className="pl-1" {...props}>
            {renderHighlightedChildren(children, searchTerms)}
          </li>
        ),
        img: ({ node, alt, ...props }) => (
          <img alt={alt} className="mb-1 mr-5 inline-block h-8 w-auto align-middle last:mr-0" {...props} />
        ),
        a: ({ node, href, ...props }) => {
          const docLink = href ? resolveDocLink(href) : null;
          if (docLink) {
            return (
              <a
                href={`/docs/${docLink.docId}${docLink.hash}`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`/docs/${docLink.docId}`);
                  if (docLink.hash) {
                    window.setTimeout(() => {
                      document.getElementById(docLink.hash.slice(1))?.scrollIntoView({ block: "start" });
                    }, 0);
                  }
                }}
                className="text-accent underline decoration-accent/30 decoration-1 underline-offset-4 transition-colors hover:decoration-accent"
                {...props}
              />
            );
          }

          return (
            <a
              href={href}
              className="text-accent underline decoration-accent/30 decoration-1 underline-offset-4 transition-colors hover:decoration-accent"
              {...props}
            />
          );
        },
        code: ({ node, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match && !className;
          const language = match?.[1]?.toLowerCase() ?? "";
          const text = String(children);
          const isCommandBlock = ["bash", "sh", "shell", "powershell", "ps1", "zsh"].includes(language);

          return isInline ? (
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-ink" {...props}>
              {highlightText(text, highlightQuery)}
            </code>
          ) : isCommandBlock ? (
            <CommandSnippet
              command={text}
              prefix={language === "powershell" || language === "ps1" ? ">" : "$"}
              className="mb-6"
            />
          ) : (
            <code
              className={`mb-6 block overflow-x-auto rounded-xl border border-line bg-surface-2 p-5 text-sm font-mono text-ink ${className || ""}`}
              {...props}
            >
              {highlightText(text, highlightQuery)}
            </code>
          );
        },
        pre: ({ node, ...props }) => <pre className="m-0 bg-transparent p-0" {...props} />,
        table: ({ node, ...props }) => (
          <div className="mb-6 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm [&_tr:last-child>td]:border-b-0" {...props} />
          </div>
        ),
        th: ({ node, children, ...props }) => (
          <th className="border-b border-line bg-surface px-4 py-3 font-medium text-ink" {...props}>
            {renderHighlightedChildren(children, searchTerms)}
          </th>
        ),
        td: ({ node, children, ...props }) => (
          <td className="border-b border-line px-4 py-3 text-muted" {...props}>
            {renderHighlightedChildren(children, searchTerms)}
          </td>
        ),
        blockquote: ({ node, children, ...props }) => (
          <blockquote className="my-6 border-l-4 border-accent/50 pl-5 italic text-muted" {...props}>
            {renderHighlightedChildren(children, searchTerms)}
          </blockquote>
        ),
        hr: ({ node, ...props }) => <hr className="my-10 border-t border-line" {...props} />,
      }}
    >
      {content}
    </Markdown>
  );
}

function renderHighlightedChildren(children: ReactNode, terms: string[]): ReactNode {
  if (!terms.length) return children;

  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return highlightText(child, terms.join(" "));
    }

    if (!isValidElement(child)) {
      return child;
    }

    const element = child as ReactElement<{ children?: ReactNode }>;
    if (typeof element.type === "string" && element.props?.children) {
      return cloneElement(element, {
        children: renderHighlightedChildren(element.props.children, terms),
      });
    }

    return child;
  });
}
