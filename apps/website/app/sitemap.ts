import type { MetadataRoute } from "next";
import { DOCS } from "@/components/docs/docs-data";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

const STATIC_ROUTES = ["/", "/download", "/pricing", "/contact", "/docs/quickstart"];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => {
    const changeFrequency: "weekly" | "monthly" = route === "/" ? "weekly" : "monthly";
    return {
      url: new URL(route, SITE_URL).toString(),
      changeFrequency,
      priority: route === "/" ? 1 : 0.8,
    };
  });

  const docsEntries: MetadataRoute.Sitemap = DOCS.filter((doc) => doc.id !== "quickstart").map(
    (doc) => ({
      url: new URL(`/docs/${doc.id}`, SITE_URL).toString(),
      changeFrequency: "monthly",
      priority: 0.7,
    }),
  );

  return [...staticEntries, ...docsEntries];
}
