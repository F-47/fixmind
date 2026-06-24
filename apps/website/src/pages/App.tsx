import FeaturesSection from "@/components/home/featuresSection";
import Hero from "@/components/home/hero";
import HowItWorksSection from "@/components/home/howItWorksSection";
import LoopSection from "@/components/home/loopSection";
import MemorySection from "@/components/home/memorySection";
import TokensSection from "@/components/home/tokensSection";
import { usePageMeta } from "@/router";

export default function App() {
  usePageMeta(
    "Fixmind — Close the loop on AI bug fixes",
    "Fixmind is a local-first MCP server that turns every AI bug fix into a lesson you actually remember, then reuses those lessons as memory in later tasks. Local by default, no account required.",
  );

  return (
    <>
      <Hero />
      <LoopSection />
      <MemorySection />
      <FeaturesSection />
      <TokensSection />
      <HowItWorksSection />
    </>
  );
}
