import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouter } from "./router";

const SECTION_IDS = ["loop", "features", "tokens", "how", "commands"];

const NAV_OFFSET = 80; // sticky nav height (64px) + a little breathing room

function useActiveSection(enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setActive(null);
      return;
    }
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    function update() {
      let current: string | null = null;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= NAV_OFFSET) current = section.id;
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

export const INSTALL_CMD = "npm install -g fixmind && fixmind setup";
export const REPO_URL = "https://github.com/F-47/fixmind";
export const CONTACT_EMAIL = "hello@fixmind.dev";
export const SUPPORT_EMAIL = "support@fixmind.dev";

export function Logo({ size = 20 }: { size?: number }) {
  return (
    <img
      src="/logo.jpeg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="rounded-[7px]"
      style={{ width: size, height: size }}
    />
  );
}

function NavLink({
  to,
  isActive,
  children,
}: {
  to: string;
  isActive: boolean;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={`relative pb-0.5 transition-colors hover:text-ink ${isActive ? "text-ink" : ""}`}>
      {children}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 -bottom-px h-[2px] origin-left scale-x-0 bg-accent transition-transform duration-300 ${
          isActive ? "scale-x-100" : ""
        }`}
      />
    </Link>
  );
}

export function Nav() {
  const { path } = useRouter();
  const active = useActiveSection(path === "/");

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-line/60 bg-bg/60 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-mono text-sm font-medium text-ink">
          <Logo />
          fixmind
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted sm:flex">
          <NavLink to="/#loop" isActive={active === "loop"}>
            The loop
          </NavLink>
          <NavLink to="/#features" isActive={active === "features"}>
            Features
          </NavLink>
          <NavLink to="/#tokens" isActive={active === "tokens"}>
            Token cost
          </NavLink>
          <NavLink to="/#how" isActive={active === "how"}>
            How it works
          </NavLink>
          <NavLink to="/#commands" isActive={active === "commands"}>
            Commands
          </NavLink>
          <NavLink to="/pricing" isActive={path === "/pricing"}>
            Pricing
          </NavLink>
          <NavLink to="/contact" isActive={path === "/contact"}>
            Contact
          </NavLink>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/#commands"
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Install
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 font-mono text-ink">
            <Logo size={18} />
            fixmind
          </div>
          <p className="text-sm text-muted">Local-first learning lessons for AI-assisted fixes.</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
        <p className="mt-6 border-t border-line pt-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          MIT licensed · No telemetry · Node 22.5+
        </p>
      </div>
    </footer>
  );
}
