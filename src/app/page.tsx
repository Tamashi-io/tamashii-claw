import { TamashiiHeader } from "@/components/landing/TamashiiHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { NetworkContributionSection } from "@/components/landing/NetworkContributionSection";
import { ValuePropSection } from "@/components/landing/ValuePropSection";
import { ModelsSection } from "@/components/landing/ModelsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TrainingLoopSection } from "@/components/landing/TrainingLoopSection";
import { TamashiiFooter } from "@/components/landing/TamashiiFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <TamashiiHeader />
      <main>
        <HeroSection />
        <NetworkContributionSection />
        <ValuePropSection />
        <ModelsSection />
        <PricingSection />
        <TrainingLoopSection />
      </main>
      <TamashiiFooter />
    </div>
  );
}
