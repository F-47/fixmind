"use client";

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { DOCS, extractDocOutline, searchDocs } from "@/components/docs/docs-data";

const DocContent = lazy(() =>
  import("@/components/docs/DocContent").then((module) => ({
    default: module.DocContent,
  })),
);
const DocSearchModal = lazy(() =>
  import("@/components/docs/DocSearchModal").then((module) => ({
    default: module.DocSearchModal,
  })),
);

type DocsPageProps = {
  initialDocId: string;
};

export default function Docs({ initialDocId }: DocsPageProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hash, setHash] = useState(
    () => (typeof window === "undefined" ? "" : window.location.hash),
  );

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery), 180);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const activeDoc = useMemo(() => {
    const slug = pathname.split("/").filter(Boolean).at(1);
    const docId =
      pathname === "/docs"
        ? initialDocId
        : slug && DOCS.some((entry) => entry.id === slug)
          ? slug
          : initialDocId;
    return DOCS.find((entry) => entry.id === docId) ?? DOCS[0];
  }, [initialDocId, pathname]);

  useEffect(() => {
    if (!hash) return;

    const scrollToHash = () => {
      const id = decodeURIComponent(hash.replace(/^#/, ""));
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ block: "start" });
    };

    const timeout = window.setTimeout(() => {
      scrollToHash();
      window.requestAnimationFrame(scrollToHash);
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(scrollToHash),
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activeDoc.id, hash]);

  const searchResults = useMemo(
    () => searchDocs(debouncedQuery),
    [debouncedQuery],
  );
  const highlightedQuery = useMemo(() => {
    const query = searchParams?.get("q")?.trim() ?? "";
    return query;
  }, [searchParams]);
  const outline = useMemo(
    () => extractDocOutline(activeDoc.content),
    [activeDoc.content],
  );
  const showOutline = outline.length > 0 && outline.length <= 8;

  const openSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setIsSearchOpen(true);
    setSelectedIndex(0);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTypingTarget
      ) {
        event.preventDefault();
        openSearch();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }

      if (isSearchOpen && searchResults.length > 0) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((current) => (current + 1) % searchResults.length);
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex(
            (current) =>
              (current - 1 + searchResults.length) % searchResults.length,
          );
        }

        if (event.key === "Enter") {
          const selected = searchResults[selectedIndex];
          if (selected) {
            event.preventDefault();
            const query = searchQuery.trim();
            const searchSuffix = query ? `?q=${encodeURIComponent(query)}` : "";
            router.push(
              `/docs/${selected.doc.id}${searchSuffix}#${selected.section.id}`,
            );
            closeSearch();
          }
        }
      }

      if (event.key === "Escape") {
        closeSearch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSearchOpen, router, searchResults, searchQuery, selectedIndex]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    setSelectedIndex(0);
  }, [debouncedQuery, isSearchOpen]);

  return (
    <div className="flex flex-col gap-10 px-6 py-12 md:flex-row md:items-start md:py-20">
      <aside className="w-full shrink-0 md:sticky md:top-24 md:w-64">
        <button
          type="button"
          onClick={openSearch}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-3 text-left text-sm text-muted transition-colors hover:border-accent hover:text-ink"
        >
          <span className="flex items-center gap-2">
            <Search size={14} />
            <span>Search docs</span>
          </span>
          <span className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">
            / or Ctrl K
          </span>
        </button>

        <nav className="mt-5 flex flex-col gap-1">
          {DOCS.map((doc) => {
            const isActive = activeDoc.id === doc.id;

            return (
              <div key={doc.id} className="rounded-lg">
                <Link
                  href={`/docs/${doc.id}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-surface-2 font-medium text-ink"
                      : "text-muted hover:bg-surface/50 hover:text-ink",
                  )}
                >
                  <span>{doc.title}</span>
                </Link>
              </div>
            );
          })}
        </nav>
      </aside>

      <article className="min-w-0 flex-1">
        <Suspense fallback={<DocContentFallback />}>
          <DocContent
            content={activeDoc.content}
            onNavigate={(href) => router.push(href)}
            highlightQuery={highlightedQuery}
          />
        </Suspense>
      </article>

      {showOutline && (
        <aside className="hidden w-56 shrink-0 xl:sticky xl:top-24 xl:block">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              On this page
            </p>
            <nav className="mt-4 space-y-1.5">
              {outline.map((item) => {
                const isActive = hash === `#${item.id}`;
                return (
                  <Link
                    key={item.id}
                    href={`/docs/${activeDoc.id}#${item.id}`}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm transition-colors",
                      item.level === 3 ? "pl-4 text-[13px]" : "text-sm",
                      isActive
                        ? "bg-accent/10 text-ink"
                        : "text-muted hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
      )}

      <Suspense fallback={null}>
        <DocSearchModal
          isOpen={isSearchOpen}
          inputRef={searchInputRef}
          inputValue={searchQuery}
          resultsQuery={debouncedQuery}
          onQueryChange={setSearchQuery}
          onClose={closeSearch}
          results={searchResults}
          selectedIndex={selectedIndex}
          onSelect={(result) => {
            const query = searchQuery.trim();
            const searchSuffix = query ? `?q=${encodeURIComponent(query)}` : "";
            router.push(
              `/docs/${result.doc.id}${searchSuffix}#${result.section.id}`,
            );
            closeSearch();
          }}
        />
      </Suspense>
    </div>
  );
}

function DocContentFallback() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-2/3 rounded bg-surface-2" />
      <div className="h-4 w-full rounded bg-surface-2" />
      <div className="h-4 w-11/12 rounded bg-surface-2" />
      <div className="h-4 w-5/6 rounded bg-surface-2" />
      <div className="mt-8 h-48 rounded-2xl border border-line bg-surface-2/60" />
    </div>
  );
}
