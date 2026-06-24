import { Suspense, StrictMode, useEffect, useLayoutEffect, useRef, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { initialAuthRedirectPath } from "./lib/supabase";
import "./styles.css";

const App = lazy(() => import("./App"));
const Pricing = lazy(() => import("./Pricing"));
const Docs = lazy(() => import("./Docs"));
const Contact = lazy(() => import("./Contact"));
const Account = lazy(() => import("./Account"));
const AccountCallback = lazy(() => import("./account/Callback"));

const UMAMI_SCRIPT_ID = "fixmind-umami-script";
const UMAMI_SRC = "https://cloud.umami.is/script.js";
const UMAMI_WEBSITE_ID = "00ae5b9c-ed36-4af5-aabe-cbcc33b32097";

function isTrackedRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname === "/contact" ||
    pathname.startsWith("/docs")
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
}

function UmamiTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const existingScript = document.getElementById(UMAMI_SCRIPT_ID);
    if (!isTrackedRoute(pathname)) {
      existingScript?.remove();
      return;
    }

    if (existingScript) return;

    const script = document.createElement("script");
    script.id = UMAMI_SCRIPT_ID;
    script.defer = true;
    script.src = UMAMI_SRC;
    script.setAttribute("data-website-id", UMAMI_WEBSITE_ID);
    document.head.append(script);

    return () => {
      script.remove();
    };
  }, [pathname]);

  return null;
}

function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    let targetId: string;
    try {
      targetId = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }

    const target = document.getElementById(targetId);
    if (target instanceof HTMLElement) {
      const offset = 72;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: Math.max(0, top),
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
      });
    }
  }, [pathname, hash]);

  return null;
}

function isSupabaseAuthHash(hash: string): boolean {
  if (!hash) return false;

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return (
    params.has("access_token") ||
    params.has("refresh_token") ||
    params.has("error") ||
    params.has("error_code") ||
    params.get("type") === "recovery" ||
    params.get("flow") === "recovery"
  );
}

function AuthHashRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const handledInitialAuthRedirect = useRef(false);

  useLayoutEffect(() => {
    if (!handledInitialAuthRedirect.current && initialAuthRedirectPath) {
      handledInitialAuthRedirect.current = true;
      if (location.pathname !== initialAuthRedirectPath) {
        navigate(
          {
            pathname: initialAuthRedirectPath,
            search: location.search,
            hash: location.hash,
          },
          { replace: true },
        );
        return;
      }
    }

    if (!isSupabaseAuthHash(location.hash)) return;
    if (location.pathname === "/account/callback") return;

    navigate(
      {
        pathname: "/account/callback",
        search: location.search,
        hash: location.hash,
      },
      { replace: true },
    );
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <UmamiTracker />
      <ScrollToTop />
      <AuthHashRedirect />
      <ScrollToHash />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/docs" element={<Navigate to="/docs/quickstart" replace />} />
          <Route path="/docs/*" element={<Docs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/account" element={<Account />} />
          <Route path="/account/callback" element={<AccountCallback />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    <Toaster theme="dark" position="bottom-right" richColors />
  </StrictMode>,
);

function RouteFallback() {
  return <div className="min-h-screen bg-page" />;
}
