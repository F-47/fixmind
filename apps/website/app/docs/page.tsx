import { Suspense } from "react";
import Docs from "@/components/docs";
import { DocsFallback } from "@/components/docs/DocsFallback";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Fixmind - Docs",
  description: "Get Fixmind running in a few minutes.",
  path: "/docs/quickstart",
});

export default function DocsIndexPage() {
  return (
    <Suspense fallback={<DocsFallback />}>
      <Docs initialDocId="quickstart" />
    </Suspense>
  );
}
