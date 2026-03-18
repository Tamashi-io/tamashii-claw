import { TamashiiHeader } from "@/components/landing/TamashiiHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { NetworkContributionSection } from "@/components/landing/NetworkContributionSection";
import { AgentsSection } from "@/components/landing/AgentsSection";
import { ValuePropSection } from "@/components/landing/ValuePropSection";
import { BeyondLLMsSection } from "@/components/landing/BeyondLLMsSection";
import { ModelsSection } from "@/components/landing/ModelsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TrainingLoopSection } from "@/components/landing/TrainingLoopSection";
import { InfrastructureSection } from "@/components/landing/InfrastructureSection";
import { CTASection } from "@/components/landing/CTASection";
import { TamashiiFooter } from "@/components/landing/TamashiiFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <TamashiiHeader />
      <main>
        <HeroSection />
        <ProblemSection />
        <NetworkContributionSection />
        <AgentsSection />
        <ValuePropSection />
        <BeyondLLMsSection />
        <ModelsSection />
        <PricingSection />
        <TrainingLoopSection />
        <InfrastructureSection />
        <CTASection />
      </main>
      <TamashiiFooter />
    </div>
  );
}
