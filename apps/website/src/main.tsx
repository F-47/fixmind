import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ScrollToHash, ScrollToTop } from "@/lib/scroll";
import UmamiTracker from "@/lib/umami";
import { Footer } from "@/shared/Footer";
import { Nav } from "@/shared/Nav";
import "./styles.css";

const App = lazy(() => import("@/pages/App"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Docs = lazy(() => import("@/pages/Docs"));
const Contact = lazy(() => import("@/pages/Contact"));
const Account = lazy(() => import("@/pages/Account"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <UmamiTracker />
      <ScrollToTop />
      <ScrollToHash />
      <Nav />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route
            path="/docs"
            element={<Navigate to="/docs/quickstart" replace />}
          />
          <Route path="/docs/*" element={<Docs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </Suspense>
      <Footer />
    </BrowserRouter>
    <Toaster theme="dark" position="bottom-right" richColors closeButton />
  </StrictMode>,
);

function RouteFallback() {
  return <div className="min-h-screen bg-page" />;
}
