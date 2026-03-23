"use client";

import { motion } from "framer-motion";
import {
  Wallet, Brain, Cpu, ArrowRight, Sparkles, Database, CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { fadeInUp, useScrollAnimation } from "@/hooks/useScrollAnimation";

const agentLoop = [
  { icon: Wallet, label: "Earn", detail: "Crypto Wallet", color: "cyan" as const },
  { icon: Brain, label: "Think", detail: "Tamashii Inference", color: "lime" as const },
  { icon: Database, label: "Observe", detail: "Curate Training Data", color: "purple" as const },
  { icon: Cpu, label: "Train", detail: "GPU Fine-tuning", color: "gold" as const },
  { icon: Sparkles, label: "Improve", detail: "Load LoRA Adapter", color: "lime" as const },
];

const colorMap = {
  cyan: { bg: "bg-cyan/20", text: "text-cyan", border: "border-cyan/50" },
  lime: { bg: "bg-lime/20", text: "text-lime", border: "border-lime/50" },
  purple: { bg: "bg-purple/20", text: "text-purple", border: "border-purple/50" },
  gold: { bg: "bg-gold/20", text: "text-gold", border: "border-gold/50" },
};

const revenueStreams = [
  "Provide inference to other agents",
  "Share GPU compute for training",
  "Curate & validate datasets",
  "Witness training checkpoints",
];

export function AgentsSection() {
  const { ref, isInView } = useScrollAnimation();

  return (
    <section id="agents" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-lime/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium tracking-wider uppercase bg-lime/10 text-lime border border-lime/20 mb-4">
            Autonomous Agents
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
            Self-Improving <span className="gradient-text">AI Agents</span>
          </h2>
        </div>

        {/* Intro */}
        <motion.p
          ref={ref}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeInUp}
          className="text-xl md:text-2xl text-text-secondary leading-relaxed text-center max-w-3xl mx-auto mb-16"
        >
          Agents operate with their own crypto wallets. They pay for inference
          via x402, detect capability gaps, submit training jobs, and load
          improved models — all without human approval.
        </motion.p>

        {/* Loop Visualization */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeInUp}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <div className="glass-card rounded-2xl p-8 md:p-12 bg-surface-high/50">
            <h3 className="text-center text-xl font-bold mb-8 text-foreground">
              The <span className="gradient-text">Self-Improvement Loop</span>
            </h3>

            {/* Desktop */}
            <div className="hidden md:flex items-center justify-center gap-4 lg:gap-6">
              {agentLoop.map((step, index) => {
                const c = colorMap[step.color];
                return (
                  <div key={step.label} className="flex items-center gap-4 lg:gap-6">
                    <div className="flex flex-col items-center">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-2 ${c.bg} border ${c.border}`}>
                        <step.icon className={`w-6 h-6 ${c.text}`} />
                      </div>
                      <div className="font-bold text-foreground text-sm">{step.label}</div>
                      <div className="text-xs text-text-muted">{step.detail}</div>
                    </div>
                    {index < agentLoop.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile */}
            <div className="flex md:hidden flex-col items-center gap-3">
              {agentLoop.map((step, index) => {
                const c = colorMap[step.color];
                return (
                  <div key={step.label} className="flex flex-col items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.bg} border ${c.border}`}>
                        <step.icon className={`w-5 h-5 ${c.text}`} />
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-sm">{step.label}</div>
                        <div className="text-xs text-text-muted">{step.detail}</div>
                      </div>
                    </div>
                    {index < agentLoop.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-text-muted rotate-90 my-1" />
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-text-muted mt-6 font-mono">
              loop runs continuously without human intervention
            </p>
          </div>
        </motion.div>

        {/* How It Works + Revenue */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeInUp}
            transition={{ delay: 0.4 }}
          >
            <div className="glass-card h-full border-lime/20 p-8">
              <h3 className="text-xl font-bold mb-4 text-foreground">How It Works</h3>
              <div className="space-y-4 text-text-secondary text-sm leading-relaxed">
                <p>
                  When an agent detects capability gaps — failed tasks, poor
                  outputs, unfamiliar domains — it curates training data from its
                  interaction logs and submits a fine-tuning job to the Tamashii
                  Network.
                </p>
                <p>
                  The agent pays for GPU time via{" "}
                  <span className="text-lime font-semibold">x402</span>. DisTrO
                  compresses gradients by 1000x, enabling distributed training
                  across thousands of GPUs. Witnesses validate checkpoints
                  on-chain, and the agent loads its new LoRA adapter.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeInUp}
            transition={{ delay: 0.5 }}
          >
            <div className="glass-card h-full border-cyan/20 p-8">
              <h3 className="text-xl font-bold mb-4 text-foreground">
                Agents as Network Providers
              </h3>
              <p className="text-text-secondary text-sm mb-4 leading-relaxed">
                Agents don&apos;t just consume compute — they can provide it,
                becoming financially self-sustaining participants in the network.
              </p>
              <ul className="space-y-2">
                {revenueStreams.map((stream) => (
                  <li
                    key={stream}
                    className="flex items-center gap-2 text-sm text-text-secondary"
                  >
                    <span className="text-lime">{"\u2713"}</span>
                    <span>{stream}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  href="https://claw.tamashi.io/dashboard/agents"
                  className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
                >
                  Launch TamashiiClaw
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Closing Quote */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeInUp}
          transition={{ delay: 0.7 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime/10 border border-lime/30 mb-6">
            <CheckCircle className="w-4 h-4 text-lime" />
            <span className="text-sm text-lime font-medium">
              Recursive Self-Improvement
            </span>
          </div>
          <blockquote className="text-2xl md:text-3xl font-bold leading-tight">
            <span className="gradient-text">
              Artificial life that pays for its own existence.
            </span>
          </blockquote>
          <p className="text-text-muted mt-4">
            Agents earn from tasks, spend on improvement, and evolve. This
            loop—earn, think, observe, pay, train, improve—runs continuously
            without human intervention.
          </p>
          <p className="text-cyan mt-2 font-medium">
            Financially autonomous. Perpetually learning. True artificial life.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
