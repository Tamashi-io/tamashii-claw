"use client";

import { motion } from "framer-motion";
import { ArrowRight, Bot, Cpu, Zap, Shield } from "lucide-react";

const highlights = [
  { icon: Bot, label: "Autonomous Agents", detail: "24/7 uptime" },
  { icon: Cpu, label: "B200 GPUs", detail: "Frontier models" },
  { icon: Zap, label: "Instant Deploy", detail: "One click" },
  { icon: Shield, label: "Solana Payments", detail: "SOL or USDC" },
];

export function HeroSection() {
  return (
    <section className="section-dark relative pt-32 pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="hero-content text-center max-w-4xl mx-auto">
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Deploy AI Agents in <span className="text-primary">Seconds</span>
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Persistent, autonomous AI agents on decentralized B200 GPUs. Flat-rate inference, OpenAI-compatible API, pay with SOL or USDC.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <a
              href="/dashboard/agents"
              className="btn-primary px-8 py-3 rounded-lg text-base font-semibold inline-flex items-center gap-2"
            >
              Deploy Agent
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#features"
              className="btn-secondary px-8 py-3 rounded-lg text-base font-semibold"
            >
              Learn More
            </a>
          </motion.div>
        </div>

        {/* Highlights */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          {highlights.map((item) => (
            <div key={item.label} className="card p-6">
              <item.icon className="w-6 h-6 text-primary mb-3" />
              <div className="text-base font-semibold text-foreground mb-1">{item.label}</div>
              <div className="text-sm text-text-secondary">{item.detail}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
