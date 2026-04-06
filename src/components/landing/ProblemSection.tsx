"use client";

import { motion } from "framer-motion";
import { Bot, Code, Wallet } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Autonomous Agent Hosting",
    description: "Deploy persistent AI agents that run 24/7. Dedicated CPU, memory, and built-in inference on decentralized GPU infrastructure.",
    bullets: [
      "24/7 agent uptime",
      "Dedicated resources per agent",
      "Start, stop, and scale on demand",
    ],
  },
  {
    icon: Code,
    title: "OpenAI-Compatible API",
    description: "Drop-in replacement for any OpenAI SDK client. Zero code changes needed — just swap your base URL and start building.",
    bullets: [
      "Works with any OpenAI SDK",
      "Frontier models included",
      "Flat-rate, no per-token charges",
    ],
  },
  {
    icon: Wallet,
    title: "Solana Payments",
    description: "Pay with SOL or USDC on Solana. Automatically swapped and bridged via LI.FI. No credit card required.",
    bullets: [
      "Pay in SOL or USDC-SPL",
      "Auto-bridged to Base via LI.FI",
      "No credit card or KYC required",
    ],
  },
];

export function ProblemSection() {
  return (
    <section className="section-light py-24" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-foreground-on-light mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Why <span className="gradient-text">TamashiiClaw</span>
          </motion.h2>
          <motion.p
            className="text-lg text-text-tertiary max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            The easiest way to deploy and manage autonomous AI agents
          </motion.p>
        </div>

        <motion.div
          className="grid md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {features.map((feature) => (
            <div key={feature.title} className="card-light p-8 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground-on-light">{feature.title}</h3>
              </div>
              <p className="text-text-tertiary mb-6 leading-relaxed">
                {feature.description}
              </p>
              <ul className="space-y-2">
                {feature.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2 text-sm text-text-tertiary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
