"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Brain,
  Sparkles,
  Database,
  Cpu,
  Wallet,
  ArrowRight,
  Check,
} from "lucide-react";

const loop = [
  {
    icon: Wallet,
    label: "Earn",
    detail: "Agent completes tasks and earns crypto",
    color: "lime",
  },
  {
    icon: Brain,
    label: "Think",
    detail: "Calls TamashiiClaw for inference via x402",
    color: "cyan",
  },
  {
    icon: Database,
    label: "Observe",
    detail: "Detects gaps, curates training data",
    color: "purple",
  },
  {
    icon: Cpu,
    label: "Train",
    detail: "Submits fine-tuning job to the network",
    color: "amber",
  },
  {
    icon: Sparkles,
    label: "Improve",
    detail: "Loads LoRA adapter, becomes smarter",
    color: "lime",
  },
];

const capabilities = [
  "Agents pay for inference and training with x402 — no API keys, no subscriptions",
  "Failed tasks become training data — continuous improvement without human intervention",
  "DisTrO compression enables fine-tuning across thousands of distributed GPUs",
  "Witness nodes validate training checkpoints on-chain via EVM smart contracts",
  "Fine-tuned LoRA adapters are loaded back — agents get smarter every cycle",
  "Agents can earn by hosting models, sharing compute, and curating datasets",
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  lime: {
    bg: "bg-lime/15",
    text: "text-primary",
    border: "border-lime/30",
  },
  cyan: {
    bg: "bg-cyan-400/15",
    text: "text-cyan-400",
    border: "border-cyan-400/30",
  },
  purple: {
    bg: "bg-purple-400/15",
    text: "text-purple-400",
    border: "border-purple-400/30",
  },
  amber: {
    bg: "bg-amber-400/15",
    text: "text-amber-400",
    border: "border-amber-400/30",
  },
};

export function TrainingLoopSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
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
            The Agentic{" "}
            <span className="gradient-text-primary">Training Loop</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Agents on the Tamashii Network don&apos;t just consume inference — they
            drive decentralized training. Every interaction creates data, every
            failure becomes a lesson, every cycle produces a better model.
          </p>
        </motion.div>

        {/* Loop Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-card p-6 sm:p-10 mb-12"
        >
          <h3 className="text-center text-xl font-bold text-foreground mb-8">
            Self-Improvement Cycle
          </h3>

          {/* Desktop: horizontal */}
          <div className="hidden md:flex items-center justify-center gap-4">
            {loop.map((step, index) => {
              const Icon = step.icon;
              const c = colorMap[step.color];
              return (
                <div key={step.label} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-14 h-14 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-2`}
                    >
                      <Icon className={`w-6 h-6 ${c.text}`} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {step.label}
                    </span>
                    <span className="text-xs text-text-muted text-center max-w-[120px] mt-0.5">
                      {step.detail}
                    </span>
                  </div>
                  {index < loop.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-text-muted/30 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile: vertical */}
          <div className="flex md:hidden flex-col items-center gap-3">
            {loop.map((step, index) => {
              const Icon = step.icon;
              const c = colorMap[step.color];
              return (
                <div key={step.label} className="flex flex-col items-center">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}
                    >
                      <Icon className={`w-5 h-5 ${c.text}`} />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-foreground">
                        {step.label}
                      </span>
                      <p className="text-xs text-text-muted">{step.detail}</p>
                    </div>
                  </div>
                  {index < loop.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-text-muted/20 rotate-90 my-1" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Repeat indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center"
          >
            <span className="text-xs font-mono text-text-muted bg-surface-low px-3 py-1 rounded-full">
              loop runs continuously without human intervention
            </span>
          </motion.div>
        </motion.div>

        {/* Two-column: explanation + capabilities */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: narrative */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="glass-card p-6 sm:p-8"
          >
            <h3 className="text-xl font-bold text-foreground mb-4">
              How It Works
            </h3>
            <div className="space-y-4 text-text-secondary text-sm leading-relaxed">
              <p>
                When an agent detects capability gaps — failed tasks, poor
                outputs, unfamiliar domains — it curates training data from its
                own interaction logs and submits a fine-tuning job to the
                Tamashii Network.
              </p>
              <p>
                The agent pays for GPU time via{" "}
                <span className="text-primary font-medium">
                  x402 on-chain payments
                </span>
                . DisTrO compresses gradients by 1000x, enabling distributed
                training across thousands of GPUs that would otherwise be
                impossible over standard internet connections.
              </p>
              <p>
                When training completes, witness nodes validate the checkpoint
                on-chain, and the agent loads its new LoRA adapter. It&apos;s now
                smarter than it was yesterday — and the improved model is
                available to every TamashiiClaw user.
              </p>
            </div>
          </motion.div>

          {/* Right: capabilities checklist */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="glass-card p-6 sm:p-8"
          >
            <h3 className="text-xl font-bold text-foreground mb-4">
              Agentic Training
            </h3>
            <ul className="space-y-3">
              {capabilities.map((cap, index) => (
                <motion.li
                  key={cap}
                  initial={{ opacity: 0, x: 10 }}
                  animate={
                    isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }
                  }
                  transition={{ delay: 0.6 + index * 0.05 }}
                  className="flex items-start gap-2 text-sm text-text-secondary"
                >
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{cap}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
