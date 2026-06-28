import FeaturesSection from "@/components/home/featuresSection";
import HomeAnalytics from "@/components/home/HomeAnalytics";
import Hero from "@/components/home/hero";
import HowItWorksSection from "@/components/home/howItWorksSection";
import LoopSection from "@/components/home/loopSection";
import MemorySection from "@/components/home/memorySection";
import TokensSection from "@/components/home/tokensSection";

export default function App() {
  return (
    <>
      <HomeAnalytics />
      <Hero />
      <LoopSection />
      <MemorySection />
      <FeaturesSection />
      <TokensSection />
      <HowItWorksSection />
    </>
  );
}
