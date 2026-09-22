"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function ScrollToTop() {
  const pathname = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: every route transition should scroll to the top
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
}

export function ScrollToHash() {
  const pathname = usePathname();
  const [hash, setHash] = useState(() =>
    typeof window === "undefined" ? "" : window.location.hash,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: route changes can replace the hash without a hashchange event
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [pathname]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retry anchor scrolling after route content changes
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
  }, [hash, pathname]);

  return null;
}
