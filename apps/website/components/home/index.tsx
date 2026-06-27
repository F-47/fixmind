import FeaturesSection from "@/components/home/featuresSection";
import Hero from "@/components/home/hero";
import HowItWorksSection from "@/components/home/howItWorksSection";
import LoopSection from "@/components/home/loopSection";
import MemorySection from "@/components/home/memorySection";
import TokensSection from "@/components/home/tokensSection";

export default function App() {
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
