import ReactMarkdown from "react-markdown";

interface MarkdownTextProps {
  children: string;
  className?: string;
}

/** Renders lesson prose as safe Markdown. Raw HTML is deliberately not enabled. */
export function MarkdownText({ children, className }: MarkdownTextProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          h1: ({ children: content }) => <h1 className="mt-5 text-2xl font-semibold tracking-tight first:mt-0">{content}</h1>,
          h2: ({ children: content }) => <h2 className="mt-5 text-xl font-semibold tracking-tight first:mt-0">{content}</h2>,
          h3: ({ children: content }) => <h3 className="mt-4 text-lg font-semibold first:mt-0">{content}</h3>,
          p: ({ children: content }) => <p className="mt-3 first:mt-0">{content}</p>,
          ul: ({ children: content }) => <ul className="mt-3 list-disc space-y-1 pl-5">{content}</ul>,
          ol: ({ children: content }) => <ol className="mt-3 list-decimal space-y-1 pl-5">{content}</ol>,
          li: ({ children: content }) => <li>{content}</li>,
          blockquote: ({ children: content }) => <blockquote className="mt-3 border-l-2 border-line pl-4 text-muted italic">{content}</blockquote>,
          a: ({ children: content, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
              {content}
            </a>
          ),
          pre: ({ children: content }) => (
            <pre className="mt-3 overflow-x-auto border border-line bg-surface p-4 font-mono text-sm leading-relaxed">{content}</pre>
          ),
          code: ({ children: content, className: codeClassName }) => {
            const isBlock = Boolean(codeClassName) || String(content).includes("\n");
            return (
              <code className={isBlock ? codeClassName : "rounded bg-surface px-1.5 py-0.5 font-mono text-[0.9em]"}>
                {content}
              </code>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
