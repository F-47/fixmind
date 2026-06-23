import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useLayoutEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import Account from "./Account";
import AccountCallback from "./account/Callback";
import App from "./App";
import Contact from "./Contact";
import Docs from "./Docs";
import Pricing from "./Pricing";
import { initialAuthRedirectPath } from "./lib/supabase";
import "./styles.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
}

function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (!hash) return;

    let targetId: string;
    try {
      targetId = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }

    const target = document.getElementById(targetId);
    if (target instanceof HTMLElement) {
      target.scrollIntoView();
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
      <ScrollToTop />
      <AuthHashRedirect />
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/docs" element={<Navigate to="/docs/quickstart" replace />} />
        <Route path="/docs/*" element={<Docs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/callback" element={<AccountCallback />} />
      </Routes>
    </BrowserRouter>
    <Toaster theme="dark" position="bottom-right" richColors />
  </StrictMode>,
);
