"use client";

import { LogIn, User } from "lucide-react";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Logo } from "./Logo";
import { cn } from "@/lib/cn";
import { useSessionQuery } from "@/services/queries";

const SECTION_IDS = ["loop", "memory", "features", "tokens", "how"];

function sectionFromHash(hash: string): string | null {
  const value = hash.replace(/^#/, "");
  return SECTION_IDS.includes(value) ? value : null;
}

function useActiveSection(enabled: boolean, hash: string): string | null {
  const [active, setActive] = useState<string | null>(() =>
    sectionFromHash(hash),
  );

  useEffect(() => {
    setActive(sectionFromHash(hash));
  }, [hash]);

  useEffect(() => {
    if (!enabled) {
      setActive(null);
      return;
    }
    const sections = SECTION_IDS.map((id) =>
      document.getElementById(id),
    ).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }

        if (visible.size === 0) return;
        const ordered = SECTION_IDS.filter((id) => visible.has(id));
        setActive(ordered.at(-1) ?? null);
      },
      {
        root: null,
        rootMargin: "-88px 0px -52% 0px",
        threshold: 0,
      },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [enabled]);

  return active;
}

function NavLink({
  to,
  isActive,
  eventName,
  children,
  onClick,
  className,
}: {
  to: string;
  isActive: boolean;
  eventName?: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const [underlineOn, setUnderlineOn] = useState(false);
  const hash = to.includes("#") ? to.slice(to.indexOf("#")) : "";

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      !hash ||
      typeof window === "undefined" ||
      window.location.pathname !== "/"
    ) {
      onClick?.();
      return;
    }

    const target = document.getElementById(hash.slice(1));
    if (!target) {
      onClick?.();
      return;
    }

    event.preventDefault();
    const offset = 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    onClick?.();
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => setUnderlineOn(isActive));
    return () => cancelAnimationFrame(raf);
  }, [isActive]);

  return (
    <Link
      href={to}
      onClick={handleClick}
      data-umami-event={eventName}
      className={cn(
        "relative pb-0.5 transition-colors hover:text-ink",
        isActive && "text-ink",
        className,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 -bottom-px h-[2px] origin-left scale-x-0 bg-accent transition-transform duration-300",
          underlineOn && "scale-x-100",
        )}
      />
    </Link>
  );
}

const PRIMARY_LINKS = [
  { to: "/#loop", label: "The loop", section: "loop", event: "nav_loop" },
  { to: "/#memory", label: "Memory", section: "memory", event: "nav_memory" },
  {
    to: "/#features",
    label: "Features",
    section: "features",
    event: "nav_features",
  },
  { to: "/#tokens", label: "Token cost", section: "tokens", event: "nav_tokens" },
  { to: "/#how", label: "How it works", section: "how", event: "nav_how" },
];

const SECONDARY_LINKS = [
  { to: "/docs", label: "Docs", section: null as string | null, event: "nav_docs" },
  {
    to: "/pricing",
    label: "Pricing",
    section: null as string | null,
    event: "nav_pricing",
  },
  {
    to: "/contact",
    label: "Contact",
    section: null as string | null,
    event: "nav_contact",
  },
];

export function Nav() {
  const pathname = usePathname() ?? "/";
  const [hash, setHash] = useState(
    () => (typeof window === "undefined" ? "" : window.location.hash),
  );
  const active = useActiveSection(pathname === "/", hash);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSessionQuery();

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function isLinkActive(
    link: (typeof PRIMARY_LINKS)[number] | (typeof SECONDARY_LINKS)[number],
  ) {
    if (link.section) return active === link.section;
    if (link.to === "/docs") return pathname.startsWith("/docs");
    return pathname === link.to;
  }

  return (
    <>
      <a
        href="#content"
        className="fixed left-4 top-4 z-[60] rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg opacity-0 shadow-lg transition focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-line/60 bg-bg/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Link
            href="/"
            onClick={(event) => {
              if (pathname !== "/") return;
              event.preventDefault();
              window.scrollTo({
                top: 0,
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "auto"
                  : "smooth",
              });
            }}
            className="flex items-center gap-2 font-mono text-sm font-medium text-ink"
          >
            <Logo />
            fixmind
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            <div className="flex items-center gap-6 text-sm text-muted">
              {PRIMARY_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  isActive={isLinkActive(link)}
                  eventName={link.event}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
            <div className="flex items-center gap-4 border-l border-line/70 pl-4 text-sm text-muted">
              {SECONDARY_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  isActive={isLinkActive(link)}
                  eventName={link.event}
                  className="pb-0"
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/docs/quickstart"
              className="rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
            >
              Install
            </Link>

            <Link
              href="/account"
              data-umami-event={session ? "nav_account" : "nav_login"}
              aria-label={session ? "Account" : "Login"}
              title={session ? "Account" : "Login"}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:border-accent/60 hover:text-accent",
                pathname === "/account"
                  ? "border-accent/60 text-accent"
                  : "border-line text-ink",
              )}
            >
              {session ? <User size={16} /> : <LogIn size={16} />}
            </Link>

            <button
              id="mobile-menu-toggle"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-8 w-8 flex-col items-center justify-center gap-[5px] lg:hidden"
            >
              <span
                className={cn(
                  "block h-px w-5 bg-ink transition-all duration-200 origin-center",
                  menuOpen && "translate-y-[6px] rotate-45",
                )}
              />
              <span
                className={cn(
                  "block h-px w-5 bg-ink transition-opacity duration-200",
                  menuOpen && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "block h-px w-5 bg-ink transition-all duration-200 origin-center",
                  menuOpen && "-translate-y-[6px] -rotate-45",
                )}
              />
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <nav
            id="mobile-menu"
            className="absolute left-0 top-full w-full border-t border-line/60 bg-bg/95 shadow-lg backdrop-blur-md lg:hidden"
          >
            <ul className="mx-auto flex max-w-6xl flex-col px-6 py-2">
              <li className="py-2 font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                Navigate
              </li>
              {[...PRIMARY_LINKS, ...SECONDARY_LINKS].map((link) => (
                <li key={link.to}>
                  <Link
                    href={link.to}
                    onClick={() => setMenuOpen(false)}
                    data-umami-event={link.event}
                    className={cn(
                      "flex items-center gap-2 border-b border-line/40 py-3.5 text-sm transition-colors last:border-0 hover:text-ink",
                      isLinkActive(link) ? "text-ink" : "text-muted",
                    )}
                  >
                    {isLinkActive(link) && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    )}
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
    </>
  );
}
