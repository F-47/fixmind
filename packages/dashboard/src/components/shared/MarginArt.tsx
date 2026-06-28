"use client";

import { useEffect, useRef } from "react";
import { cn } from "./cn";

export function MarginArt({ side }: { side: "left" | "right" }) {
  const id = `margin-art-${side}`;
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (svgRef.current) {
          const y = window.scrollY * 0.06;
          svgRef.current.style.transform = `translateY(-${y}px)`;
        }
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed top-0 bottom-0 hidden w-24 text-muted/15 2xl:block",
        side === "left" ? "left-0" : "right-0",
      )}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 64 2000"
      style={{ willChange: "transform" }}
    >
      <defs>
        <pattern id={id} width="64" height="200" patternUnits="userSpaceOnUse">
          <line x1="32" y1="0" x2="32" y2="200" stroke="currentColor" strokeWidth="1" />
          <circle cx="32" cy="30" r="5" fill="currentColor" />
          <circle cx="32" cy="100" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="32" cy="170" r="5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="64" height="2000" fill={`url(#${id})`} />
    </svg>
  );
}
