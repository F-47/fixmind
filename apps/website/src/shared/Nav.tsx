import { LogIn, User } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { Link, useRouter } from "../router";
import { Logo } from "./Logo";

const SECTION_IDS = ["loop", "features", "tokens", "how"];

const NAV_OFFSET = 80;

function useActiveSection(enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setActive(null);
      return;
    }
    const sections = SECTION_IDS.map((id) =>
      document.getElementById(id),
    ).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    function update() {
      let current: string | null = null;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= NAV_OFFSET)
          current = section.id;
      }
      setActive(current);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled]);

  return active;
}

function useIsLoggedIn(): boolean {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setLoggedIn(data.session !== null));
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setLoggedIn(session !== null);
      },
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

  return loggedIn;
}

function NavLink({
  to,
  isActive,
  children,
  onClick,
}: {
  to: string;
  isActive: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  // Starts deactivated so the underline always animates in, even when this
  // link mounts already-active (e.g. navigating straight to a Docs page).
  const [underlineOn, setUnderlineOn] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setUnderlineOn(isActive));
    return () => cancelAnimationFrame(raf);
  }, [isActive]);

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative pb-0.5 transition-colors hover:text-ink ${isActive ? "text-ink" : ""}`}
    >
      {children}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 -bottom-px h-[2px] origin-left scale-x-0 bg-accent transition-transform duration-300 ${
          underlineOn ? "scale-x-100" : ""
        }`}
      />
    </Link>
  );
}

const NAV_LINKS = [
  { to: "/#loop", label: "The loop", section: "loop" },
  { to: "/#features", label: "Features", section: "features" },
  { to: "/#tokens", label: "Token cost", section: "tokens" },
  { to: "/#how", label: "How it works", section: "how" },
  { to: "/docs", label: "Docs", section: null as string | null },
  { to: "/pricing", label: "Pricing", section: null as string | null },
  { to: "/contact", label: "Contact", section: null as string | null },
];

export function Nav() {
  const { path } = useRouter();
  const active = useActiveSection(path === "/");
  const [menuOpen, setMenuOpen] = useState(false);
  const loggedIn = useIsLoggedIn();

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  function isLinkActive(link: (typeof NAV_LINKS)[0]) {
    if (link.section) return active === link.section;
    if (link.to === "/docs") return path.startsWith("/docs");
    return path === link.to;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-bg/60 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-mono text-sm font-medium text-ink"
        >
          <Logo />
          fixmind
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 text-sm text-muted lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} isActive={isLinkActive(link)}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/#install"
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Install
          </Link>

          <Link
            to="/account"
            aria-label={loggedIn ? "Account" : "Sign in"}
            title={loggedIn ? "Account" : "Sign in"}
            className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:border-accent/60 hover:text-accent ${
              path === "/account"
                ? "border-accent/60 text-accent"
                : "border-line text-ink"
            }`}
          >
            {loggedIn ? <User size={16} /> : <LogIn size={16} />}
          </Link>

          {/* Hamburger button — mobile only */}
          <button
            id="mobile-menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-8 w-8 flex-col items-center justify-center gap-[5px] lg:hidden"
          >
            <span
              className={`block h-px w-5 bg-ink transition-all duration-200 origin-center ${
                menuOpen ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-px w-5 bg-ink transition-opacity duration-200 ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-px w-5 bg-ink transition-all duration-200 origin-center ${
                menuOpen ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          className="absolute left-0 top-full w-full border-t border-line/60 bg-bg/95 backdrop-blur-md lg:hidden shadow-lg"
        >
          <ul className="mx-auto flex max-w-6xl flex-col px-6 py-2">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2 border-b border-line/40 py-3.5 text-sm transition-colors last:border-0 hover:text-ink ${
                    isLinkActive(link) ? "text-ink" : "text-muted"
                  }`}
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
  );
}
