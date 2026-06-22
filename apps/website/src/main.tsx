import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import Account from "./Account";
import AccountCallback from "./account/Callback";
import App from "./App";
import Contact from "./Contact";
import Docs from "./Docs";
import Pricing from "./Pricing";
import "./styles.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
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
