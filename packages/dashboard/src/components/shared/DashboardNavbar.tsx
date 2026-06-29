import { Link, useLocation } from "react-router-dom";

export function DashboardNavbar() {
  const location = useLocation();
  const inLesson = location.pathname.startsWith("/lessons/");

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-page/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <img
            alt=""
            aria-hidden="true"
            className="size-10 shrink-0 rounded-2xl"
            src="/fixmind-logo.png"
          />
          <div className="flex flex-col leading-none">
            <span className="font-serif text-lg font-bold tracking-tight text-ink">
              Fixmind
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[.24em] text-muted">
              Fixes into lessons
            </span>
          </div>
        </Link>

        <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
          {inLesson ? "Lesson" : "Dashboard"}
        </div>
      </div>
    </header>
  );
}
