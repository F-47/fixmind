import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DOCS } from "@/components/docs/docs-data";
import { pageMetadata } from "@/lib/seo";
import Docs from "@/components/docs";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return DOCS.map((doc) => ({ slug: doc.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const doc = DOCS.find((entry) => entry.id === slug);
  if (!doc) {
    return pageMetadata({
      title: "Fixmind - Docs",
      description: "Detailed documentation for Fixmind CLI and MCP integration.",
      path: "/docs/quickstart",
    });
  }

  return pageMetadata({
    title: `Fixmind - ${doc.title}`,
    description: doc.summary,
    path: `/docs/${doc.id}`,
  });
}

export default async function DocsPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = DOCS.find((entry) => entry.id === slug);
  if (!doc) notFound();
  return (
    <Suspense fallback={<DocsFallback />}>
      <Docs initialDocId={slug} />
    </Suspense>
  );
}

function DocsFallback() {
  return <div className="min-h-[60vh]" />;
}
