"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Bot, Code, Cpu, Wallet } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Autonomous Agent Hosting",
    description:
      "Deploy persistent AI agents on decentralized GPU infrastructure. Flat-rate compute with no per-token charges — built for workloads that run 24/7.",
  },
  {
    icon: Code,
    title: "OpenAI-Compatible API",
    description:
      "Drop-in replacement for any OpenAI SDK client. Zero code changes needed — just swap your base URL and start building.",
  },
  {
    icon: Cpu,
    title: "Frontier Models on B200 GPUs",
    description:
      "Kimi K2.5, GLM-5, and MiniMax M2.5 — reasoning, vision, and tool use. Powered by the Tamashii Network's decentralized compute.",
  },
  {
    icon: Wallet,
    title: "On-Chain Payments",
    description:
      "Pay with USDC via the x402 protocol. EVM-compatible, cross-chain support for SOL and BNB. Built for agent-to-agent commerce.",
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="features"
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
            Built for{" "}
            <span className="gradient-text-primary">Autonomous Agents</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Decentralized infrastructure for AI agents that never sleep.
            Deploy, scale, and pay on-chain.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{
                  duration: 0.6,
                  delay: 0.2 + index * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="glass-card p-6 sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
