"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Cpu, Globe, Gauge, Plug } from "lucide-react";

const specs = [
  {
    icon: Cpu,
    title: "B200 GPUs",
    value: "NVIDIA",
    description: "Kimi K2.5, GLM-5, and MiniMax M2.5 — reasoning, vision, and tool use on frontier hardware.",
  },
  {
    icon: Gauge,
    title: "~36M tokens/hr",
    value: "Per AIU",
    description: "Sustained throughput with 4x burst capacity. Scales linearly with your plan.",
  },
  {
    icon: Plug,
    title: "OpenAI Compatible",
    value: "Drop-in",
    description: "Works with any OpenAI SDK client. Connect your agents in minutes.",
  },
  {
    icon: Globe,
    title: "BNB & Base Payments",
    value: "BNB / USDC",
    description: "Pay with BNB or USDC on Base. Auto-bridged via LI.FI. No credit card, no KYC.",
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="section-light py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground-on-light mb-4">
            Powered by <span className="gradient-text">Frontier Hardware</span>
          </h2>
          <p className="text-lg text-text-tertiary max-w-2xl mx-auto">
            Decentralized infrastructure built for agents that run around the clock.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {specs.map((spec, index) => {
            const Icon = spec.icon;
            return (
              <motion.div
                key={spec.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{
                  duration: 0.6,
                  delay: 0.2 + index * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="card-light p-6 sm:p-8 rounded-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground-on-light mb-1">
                      {spec.title}
                    </h3>
                    <p className="text-text-tertiary text-sm leading-relaxed">
                      {spec.description}
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
