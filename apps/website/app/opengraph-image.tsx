import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

export const alt = "Fixmind";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          color: "#e9ecf4",
          background:
            "radial-gradient(circle at top left, rgba(124,92,255,0.45), transparent 36%), linear-gradient(135deg, #08090d 0%, #11141b 56%, #0e1218 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 28,
            letterSpacing: "-0.02em",
            color: "#cfd5e3",
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: "rgba(124,92,255,0.18)",
              border: "1px solid rgba(124,92,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
            }}
          >
            F
          </div>
          <span>{SITE_NAME}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 70,
              lineHeight: 1.02,
              fontWeight: 700,
              maxWidth: 940,
              letterSpacing: "-0.04em",
            }}
          >
            Close the loop on AI bug fixes.
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 820,
              color: "#a8b0c2",
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 24,
            color: "#7c5cff",
          }}
        >
          <span>fixmind.dev</span>
          <span style={{ color: "#828a9c" }}>Local-first. SEO-ready.</span>
        </div>
      </div>
    ),
    size,
  );
}
