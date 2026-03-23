"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Key, Bot, Check } from "lucide-react";

const sides = [
  {
    icon: Key,
    badge: "Inference",
    title: "API Access",
    subtitle: "For Developers & Builders",
    description:
      "Connect to frontier models through an OpenAI-compatible API. No code changes needed.",
    benefits: [
      "Drop-in OpenAI SDK replacement",
      "Flat-rate — no per-token charges",
      "Kimi K2.5, GLM-5, MiniMax M2.5",
      "~36M tokens/hour per AIU",
    ],
    cta: { label: "Get API Key", href: "https://claw.tamashii.io/dashboard/keys" },
    highlighted: false,
  },
  {
    icon: Bot,
    badge: "Agents",
    title: "Agent Hosting",
    subtitle: "For Autonomous Workloads",
    description:
      "Deploy persistent AI agents with dedicated CPU, memory, and built-in inference.",
    benefits: [
      "24/7 autonomous agent uptime",
      "Dedicated CPU & memory per agent",
      "Built-in inference — no external API needed",
      "Start, stop, and scale on demand",
    ],
    cta: { label: "Deploy Agent", href: "https://claw.tamashii.io/dashboard/agents" },
    highlighted: true,
  },
];

export function ValuePropSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="value"
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
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
            Two Ways to{" "}
            <span className="gradient-text-primary">Build</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Use the API for inference, or deploy full agents on the network.
            Both run on decentralized B200 GPUs.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {sides.map((side, index) => {
            const Icon = side.icon;
            return (
              <motion.div
                key={side.title}
                initial={{ opacity: 0, y: 30 }}
                animate={
                  isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
                }
                transition={{
                  duration: 0.6,
                  delay: 0.2 + index * 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`glass-card p-6 sm:p-8 flex flex-col ${
                  side.highlighted
                    ? "border-lime/40 shadow-[0_0_40px_rgba(57,255,20,0.08)]"
                    : ""
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-lime/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-2xl font-bold text-foreground">
                        {side.title}
                      </h3>
                      <span className="text-xs font-semibold text-primary bg-lime/10 px-2.5 py-0.5 rounded-full">
                        {side.badge}
                      </span>
                    </div>
                    <p className="text-sm text-text-tertiary">{side.subtitle}</p>
                  </div>
                </div>

                <p className="text-text-secondary mb-6 leading-relaxed">
                  {side.description}
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {side.benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-start gap-2 text-sm text-text-secondary"
                    >
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={side.cta.href}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all block text-center ${
                    side.highlighted ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {side.cta.label}
                </a>
              </motion.div>
            );
          })}
        </div>

        {/* Network connection note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="glass-card inline-flex items-center gap-6 px-8 py-4">
            {["Base", "BNB Chain", "Solana"].map((chain) => (
              <span
                key={chain}
                className="text-sm font-medium text-text-tertiary"
              >
                {chain}
              </span>
            ))}
          </div>
          <p className="text-sm text-text-muted mt-3">
            Pay with USDC on Base, or swap from BNB and Solana via x402
          </p>
        </motion.div>
      </div>
    </section>
  );
}
