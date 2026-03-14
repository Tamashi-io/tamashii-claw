import { TamashiiHeader } from "@/components/landing/TamashiiHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ValuePropSection } from "@/components/landing/ValuePropSection";
import { ModelsSection } from "@/components/landing/ModelsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TechSpecsSection } from "@/components/landing/TechSpecsSection";
import { TamashiiFooter } from "@/components/landing/TamashiiFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <TamashiiHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ValuePropSection />
        <ModelsSection />
        <PricingSection />
        <TechSpecsSection />
      </main>
      <TamashiiFooter />
    </div>
  );
}
