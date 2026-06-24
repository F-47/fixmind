import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
}

export function ScrollToHash() {
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
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      });
    }
  }, [pathname, hash]);

  return null;
}
