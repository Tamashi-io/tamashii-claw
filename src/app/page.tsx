import { TamashiiHeader } from "@/components/landing/TamashiiHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { ValuePropSection } from "@/components/landing/ValuePropSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ModelsSection } from "@/components/landing/ModelsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { CTASection } from "@/components/landing/CTASection";
import { TamashiiFooter } from "@/components/landing/TamashiiFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <TamashiiHeader />
      <main>
        <HeroSection />
        <ProblemSection />
        <ValuePropSection />
        <FeaturesSection />
        <ModelsSection />
        <PricingSection />
        <CTASection />
      </main>
      <TamashiiFooter />
    </div>
  );
}
