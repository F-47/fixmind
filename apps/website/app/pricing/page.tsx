import { Suspense } from "react";
import Pricing from "@/components/pricing";
import { PricingFallback } from "@/components/pricing/PricingFallback";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Fixmind - Pricing",
  description: "Fixmind is free and local-first forever. Pro adds encrypted sync across devices.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingFallback />}>
      <Pricing />
    </Suspense>
  );
}
