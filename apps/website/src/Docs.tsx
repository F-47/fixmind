import { useEffect, useState, useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Footer } from "./shared/Footer";
import { Nav } from "./shared/Nav";
import { usePageMeta } from "./router";

import quickstartRaw from "@docs/quickstart.md?raw";
import cliReferenceRaw from "@docs/cli-reference.md?raw";
import mcpClientsRaw from "@docs/mcp-clients.md?raw";
import lessonSchemaRaw from "@docs/lesson-schema.md?raw";
import faqRaw from "@docs/faq.md?raw";
import mcpIntegrationRaw from "@core-docs/mcp-integration.md?raw";
import changelogRaw from "@root/CHANGELOG.md?raw";

type DocEntry = {
  id: string;
  title: string;
  content: string;
  kind?: "markdown" | "clients";
};

const DOCS: DocEntry[] = [
  { id: "quickstart", title: "Quickstart", content: quickstartRaw },
  {
    id: "mcp-integration",
    title: "MCP Integration",
    content: mcpIntegrationRaw,
  },
  { id: "mcp-clients", title: "MCP Clients", content: mcpClientsRaw, kind: "clients" },
  {
    id: "commands",
    title: "Commands",
    content: cliReferenceRaw,
  },
  { id: "lesson-schema", title: "Lesson Schema", content: lessonSchemaRaw },
  { id: "faq", title: "FAQ & Troubleshooting", content: faqRaw },
  { id: "changelog", title: "Changelog", content: changelogRaw },
];

const DOC_FILENAME_TO_ID: Record<string, string> = {
  "quickstart.md": "quickstart",
  "mcp-integration.md": "mcp-integration",
  "mcp-clients.md": "mcp-clients",
  "cli-reference.md": "commands",
  "lesson-schema.md": "lesson-schema",
  "faq.md": "faq",
  "changelog.md": "changelog",
};

const MCP_CLIENTS = [
  { id: "claude-code", label: "Claude Code" },
  { id: "codex", label: "Codex" },
  { id: "cursor", label: "Cursor" },
  { id: "visual-studio-code", label: "Visual Studio Code" },
  { id: "github-copilot-cli", label: "GitHub Copilot CLI" },
  { id: "opencode", label: "OpenCode" },
  { id: "other-mcp-clients", label: "Other MCP clients" },
] as const;

function resolveDocLink(href: string): { docId: string; hash: string } | null {
  const match = /([^/]+\.md)(#.*)?$/i.exec(href);
  if (!match) return null;
  const docId = DOC_FILENAME_TO_ID[match[1].toLowerCase()];
  if (!docId) return null;
  return { docId, hash: match[2] ?? "" };
}

export default function Docs() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeDoc, setActiveDoc] = useState(DOCS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  usePageMeta(
    `Fixmind — ${activeDoc.title}`,
    "Detailed documentation for Fixmind CLI and MCP integration.",
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredDocs = useMemo(() => {
    if (!debouncedQuery) return DOCS;
    const lowerQuery = debouncedQuery.toLowerCase();
    return DOCS.filter(
      (doc) =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.content.toLowerCase().includes(lowerQuery),
    );
  }, [debouncedQuery]);

  useEffect(() => {
    const docId = location.pathname.split("/").pop();
    const doc = DOCS.find((d) => d.id === docId);
    if (doc) {
      setActiveDoc(doc);
    } else if (location.pathname === "/docs") {
      navigate(`/docs/${DOCS[0].id}`, { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (
      debouncedQuery &&
      filteredDocs.length > 0 &&
      !filteredDocs.find((d) => d.id === activeDoc.id)
    ) {
      navigate(`/docs/${filteredDocs[0].id}`);
    }
  }, [debouncedQuery, filteredDocs, activeDoc.id, navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 md:flex-row md:items-start md:py-20">
        {/* Sidebar */}
        <aside className="w-full shrink-0 md:w-64 md:sticky md:top-24 flex flex-col gap-5">
          <div>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Documentation
            </h2>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                <Search size={14} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search docs..."
                className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
          </div>

          {filteredDocs.length === 0 ? (
            <p className="text-sm text-muted">No matching documents found.</p>
          ) : (
            <nav className="flex flex-col gap-1">
              {filteredDocs.map((doc) => {
                const isActive = activeDoc.id === doc.id;
                const isClients = doc.id === "mcp-clients";

                return (
                  <div key={doc.id} className="rounded-lg">
                    <Link
                      to={`/docs/${doc.id}`}
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-surface-2 font-medium text-ink"
                          : "text-muted hover:bg-surface/50 hover:text-ink"
                      }`}
                      >
                        <span>{doc.title}</span>
                    </Link>

                    {isClients && isActive && <McpClientsAccordion />}
                  </div>
                );
              })}
            </nav>
          )}
        </aside>

        {/* Content */}
        <article className="min-w-0 flex-1">
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSlug]}
            components={{
              h1: ({ node, ...props }) => (
                <h1
                  className="mb-8 mt-2 scroll-mt-36 font-display text-3xl font-semibold tracking-tight text-ink first:mt-0 sm:text-4xl"
                  {...props}
                />
              ),
              h2: ({ node, ...props }) => (
                <h2
                  className="mb-6 mt-12 scroll-mt-36 border-b border-line pb-2 font-display text-2xl font-semibold tracking-tight text-ink"
                  {...props}
                />
              ),
              h3: ({ node, ...props }) => (
                <h3
                  className="mb-4 mt-8 scroll-mt-36 font-display text-xl font-medium text-ink"
                  {...props}
                />
              ),
              p: ({ node, ...props }) => (
                <p className="mb-5 leading-relaxed text-muted" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul
                  className="mb-6 list-disc space-y-2 pl-6 text-muted"
                  {...props}
                />
              ),
              ol: ({ node, ...props }) => (
                <ol
                  className="mb-6 list-decimal space-y-2 pl-6 text-muted"
                  {...props}
                />
              ),
              li: ({ node, ...props }) => <li className="pl-1" {...props} />,
              img: ({ node, alt, ...props }) => (
                <img
                  alt={alt}
                  className="mb-1 mr-5 inline-block h-8 w-auto align-middle last:mr-0"
                  {...props}
                />
              ),
              a: ({ node, href, ...props }) => {
                const docLink = href ? resolveDocLink(href) : null;
                if (docLink) {
                  return (
                    <a
                      href={`/docs/${docLink.docId}${docLink.hash}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/docs/${docLink.docId}`);
                        if (docLink.hash) {
                          setTimeout(() => {
                            document
                              .getElementById(docLink.hash.slice(1))
                              ?.scrollIntoView({ block: "start" });
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
                return isInline ? (
                  <code
                    className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-ink"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <code
                    className={`block bg-surface-2 p-5 rounded-xl border border-line overflow-x-auto text-sm font-mono text-ink mb-6 ${className || ""}`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ node, ...props }) => (
                <pre className="p-0 m-0 bg-transparent" {...props} />
              ),
              table: ({ node, ...props }) => (
                <div className="mb-6 overflow-x-auto rounded-xl border border-line">
                  <table
                    className="w-full text-left text-sm [&_tr:last-child>td]:border-b-0"
                    {...props}
                  />
                </div>
              ),
              th: ({ node, ...props }) => (
                <th
                  className="border-b border-line bg-surface px-4 py-3 font-medium text-ink"
                  {...props}
                />
              ),
              td: ({ node, ...props }) => (
                <td
                  className="border-b border-line px-4 py-3 text-muted"
                  {...props}
                />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote
                  className="my-6 border-l-4 border-accent/50 pl-5 italic text-muted"
                  {...props}
                />
              ),
              hr: ({ node, ...props }) => (
                <hr className="my-10 border-t border-line" {...props} />
              ),
            }}
          >
            {activeDoc.content}
          </Markdown>
        </article>
      </main>

      <Footer />
    </div>
  );
}

function McpClientsAccordion() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<(typeof MCP_CLIENTS)[number]["id"]>(
    MCP_CLIENTS[0].id,
  );

  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (MCP_CLIENTS.some((client) => client.id === hash)) {
      setSelected(hash as (typeof MCP_CLIENTS)[number]["id"]);
    }
  }, [location.hash]);

  return (
    <div className="mt-1 space-y-1 pl-3">
      {MCP_CLIENTS.map((client) => {
        const isActive = selected === client.id;
        return (
          <a
            key={client.id}
            href={`/docs/mcp-clients#${client.id}`}
            onClick={(event) => {
              event.preventDefault();
              setSelected(client.id);
              navigate("/docs/mcp-clients", { replace: false });
              setTimeout(() => {
                document
                  .getElementById(client.id)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 0);
            }}
            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-accent/5 font-medium text-ink"
                : "text-muted hover:bg-surface/50 hover:text-ink"
            }`}
          >
            {client.label}
          </a>
        );
      })}
    </div>
  );
}
