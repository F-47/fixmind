import { Link, useRouter } from "./router";

export const INSTALL_CMD = "npm install -g fixmind && fixmind setup";
export const REPO_URL = "https://github.com/F-47/fixmind";

export function Nav() {
  const { path } = useRouter();
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-line/60 bg-bg/60 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-mono text-sm font-medium text-ink">
          <span className="text-accent">▌</span>
          fixmind
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted sm:flex">
          <Link to="/#loop" className="transition-colors hover:text-ink">
            The loop
          </Link>
          <Link to="/#features" className="transition-colors hover:text-ink">
            Features
          </Link>
          <Link to="/#tokens" className="transition-colors hover:text-ink">
            Token cost
          </Link>
          <Link to="/#how" className="transition-colors hover:text-ink">
            How it works
          </Link>
          <Link to="/#commands" className="transition-colors hover:text-ink">
            Commands
          </Link>
          <Link
            to="/pricing"
            className={`transition-colors hover:text-ink ${path === "/pricing" ? "text-ink" : ""}`}
          >
            Pricing
          </Link>
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
            <span className="text-accent">▌</span>
            fixmind
          </div>
          <p className="text-sm text-muted">Local-first learning lessons for AI-assisted fixes.</p>
        </div>
        <p className="mt-6 border-t border-line pt-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          MIT licensed · No telemetry · Node 22.5+
        </p>
      </div>
    </footer>
  );
}
