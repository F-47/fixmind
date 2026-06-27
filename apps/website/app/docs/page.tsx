import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import Docs from "@/components/docs";
import { DocsFallback } from "@/components/docs/DocsFallback";

export const metadata = pageMetadata({
  title: "Fixmind - Docs",
  description: "Get Fixmind running in a few minutes.",
  path: "/docs/quickstart",
  noIndex: true,
});

export default function DocsIndexPage() {
  return (
    <Suspense fallback={<DocsFallback />}>
      <Docs initialDocId="quickstart" />
    </Suspense>
  );
}
