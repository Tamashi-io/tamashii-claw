"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Cpu, ArrowRight, Database, Wallet, Globe } from "lucide-react";

const flow = [
  {
    icon: Wallet,
    title: "You Pay for Inference",
    description:
      "Subscribe to TamashiiClaw for flat-rate access to frontier models. Your payment goes directly to GPU providers on the Tamashii Network.",
    color: "text-primary" as const,
    bg: "bg-lime/10" as const,
  },
  {
    icon: Cpu,
    title: "GPUs Serve & Train",
    description:
      "The same decentralized GPUs that answer your API calls also run distributed training jobs — fine-tuning open models using DisTrO compression.",
    color: "text-cyan-400" as const,
    bg: "bg-cyan-400/10" as const,
  },
  {
    icon: Database,
    title: "Agents Generate Training Data",
    description:
      "Your agents' interactions produce real-world data. Failed tasks, edge cases, and capability gaps become curated datasets for the next training run.",
    color: "text-purple-400" as const,
    bg: "bg-purple-400/10" as const,
  },
  {
    icon: Globe,
    title: "Models Get Better",
    description:
      "Fine-tuned LoRA adapters are loaded back into the network. Every TamashiiClaw user benefits from models that improve continuously.",
    color: "text-amber-400" as const,
    bg: "bg-amber-400/10" as const,
  },
];

const stats = [
  { value: "1000x", label: "DisTrO gradient compression" },
  { value: "B200", label: "NVIDIA GPUs across the network" },
  { value: "EVM", label: "On-chain coordination & rewards" },
];

export function NetworkContributionSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="network"
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-background-secondary"
    >
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-grid-pattern" />

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Powering Decentralized{" "}
            <span className="gradient-text-primary">AI Training</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Every API call on TamashiiClaw funds the Tamashii Network —
            a decentralized GPU network that trains open AI models using
            DisTrO compression. Use inference, improve the models.
          </p>
        </motion.div>

        {/* Flow Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {flow.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                animate={
                  isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
                }
                transition={{
                  duration: 0.6,
                  delay: 0.2 + index * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="glass-card p-6 sm:p-8 relative"
              >
                {/* Step number */}
                <div className="absolute top-4 right-4 text-xs font-mono text-text-muted">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg ${step.bg} flex items-center justify-center mb-4`}
                >
                  <Icon className={`w-5 h-5 ${step.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {step.description}
                </p>

                {/* Arrow connector (desktop) */}
                {index < flow.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-5 h-5 text-text-muted/30" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="glass-card p-6"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
