import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HomePage } from "@/components/home/HomePage";
import { DashboardNavbar } from "@/components/shared/DashboardNavbar";
import { MarginArt } from "@/components/shared/MarginArt";
import { DashboardDataProvider, useDashboardData } from "@/hooks/useDashboardData";

const LessonRoutePage = lazy(() =>
  import("@/components/lesson/LessonRoutePage").then((module) => ({
    default: module.LessonRoutePage,
  })),
);
const PracticePage = lazy(() =>
  import("@/components/practice/PracticePage").then((module) => ({
    default: module.PracticePage,
  })),
);

function ScrollToTop() {
  const location = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: every dashboard navigation should reset scroll position
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname, location.search]);

  return null;
}

function AppRoutes() {
  const { saved } = useDashboardData();

  useEffect(() => {
    document.title = "fixmind - close the loop on AI bug fixes";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        "Fixmind is a local-first MCP server that turns every AI bug fix into a lesson you actually remember. Local by default, no account required.",
      );
  }, []);

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/lessons/:lessonId" element={<LessonRoutePage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </Suspense>

      {saved && (
        <div className="fixed right-6 bottom-6 rounded-xl border border-positive/30 bg-surface px-4 py-3 font-mono text-[12px] uppercase tracking-[.1em] text-positive shadow-lg animate-fade-up">
          Review saved
        </div>
      )}
    </>
  );
}

function RouteFallback() {
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-10 text-lg text-muted sm:px-6 lg:px-8">
      Loading...
    </main>
  );
}

export default function App() {
  return (
    <>
      <MarginArt side="left" />
      <MarginArt side="right" />
      <BrowserRouter>
        <DashboardDataProvider>
          <DashboardNavbar />
          <AppRoutes />
        </DashboardDataProvider>
      </BrowserRouter>
    </>
  );
}
