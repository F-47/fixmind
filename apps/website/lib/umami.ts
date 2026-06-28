"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const UMAMI_SCRIPT_ID = "fixmind-umami-script";
const UMAMI_SRC = "https://cloud.umami.is/script.js";
const UMAMI_WEBSITE_ID = "00ae5b9c-ed36-4af5-aabe-cbcc33b32097";

type UmamiTrackData = Record<
  string,
  string | number | boolean | null | undefined
>;

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: UmamiTrackData) => void;
    };
  }
}

function isTrackedRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname === "/contact" ||
    pathname.startsWith("/docs")
  );
}

export default function UmamiTracker() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

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

export function trackUmamiEvent(
  eventName: string,
  data?: UmamiTrackData,
): void {
  if (typeof window === "undefined") return;
  window.umami?.track(eventName, data);
}
