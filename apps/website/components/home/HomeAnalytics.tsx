"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackUmamiEvent } from "@/lib/umami";

const SECTION_IDS = ["loop", "memory", "features", "tokens", "how"] as const;
const SCROLL_MILESTONES = [25, 50, 75, 90] as const;

export default function HomeAnalytics() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (pathname !== "/") return;

    const seenSections = new Set<string>();
    const seenMilestones = new Set<number>();

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const section = entry.target.id;
          if (!SECTION_IDS.includes(section as (typeof SECTION_IDS)[number])) {
            continue;
          }
          if (seenSections.has(section)) continue;
          seenSections.add(section);
          trackUmamiEvent("home_section_view", { section });
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: 0.1,
      },
    );

    for (const id of SECTION_IDS) {
      const section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    }

    let ticking = false;
    const measureScrollDepth = () => {
      ticking = false;
      const scrollRoot = document.documentElement;
      const maxScroll = scrollRoot.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;

      const progress = (window.scrollY / maxScroll) * 100;
      for (const milestone of SCROLL_MILESTONES) {
        if (progress >= milestone && !seenMilestones.has(milestone)) {
          seenMilestones.add(milestone);
          trackUmamiEvent("home_scroll_depth", { depth: milestone });
        }
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(measureScrollDepth);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measureScrollDepth);
    window.requestAnimationFrame(measureScrollDepth);

    return () => {
      sectionObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measureScrollDepth);
    };
  }, [pathname]);

  return null;
}
