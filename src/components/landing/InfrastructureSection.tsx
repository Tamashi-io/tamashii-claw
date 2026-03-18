"use client";

import { motion } from "framer-motion";
import { Code, Cpu, Zap, Cloud, Link2, Server } from "lucide-react";
import { fadeInUp, useScrollAnimation } from "@/hooks/useScrollAnimation";

const services = [
  { icon: Code, title: "Fine-Tuning", description: "Projects and agents propose rewards to incentivize fine-tuning.", accent: "purple" as const },
  { icon: Cpu, title: "GPU Provision", description: "Earn USDC or project tokens for training jobs.", accent: "cyan" as const },
  { icon: Cloud, title: "Model Hosting", description: "Host fine-tuned models for inference and earn revenue.", accent: "gold" as const },
  { icon: Zap, title: "Distributed Training", description: "Scale across thousands of GPUs with DisTrO.", accent: "lime" as const },
  { icon: Link2, title: "Smart Contracts", description: "On-chain coordination, verification, and rewards via EVM.", accent: "gold" as const },
  { icon: Server, title: "Training Runs", description: "Join jobs as provider or create runs as researcher.", accent: "purple" as const },
];

const coreFunctions = [
  { icon: Zap, title: "Train & Fine-Tune", description: "Distributed training with DisTrO compression, data processing, model training, performance tuning..." },
  { icon: Server, title: "Inference & Hosting", description: "Deploy fine-tuned models for inference, earn revenue from API usage, scalable serving infrastructure..." },
  { icon: Link2, title: "Compute Coordination", description: "EVM network integration, smart contract coordination, transparent verification, reward distribution..." },
];

const networks = [
  { name: "EVM", color: "#39ff14" },
  { name: "Base", color: "#0052FF" },
  { name: "BNB Chain", color: "#F3BA2F" },
  { name: "Arbitrum", color: "#28A0F0" },
  { name: "Avalanche", color: "#E84142" },
  { name: "Sui", color: "#6FBCF0" },
];

const gpuTypes = ["NVIDIA H100", "NVIDIA H200", "AMD MI300", "RTX 4090", "RTX 3090"];

const accentClasses = {
  purple: "border-purple/50 bg-purple/10",
  cyan: "border-cyan/50 bg-cyan/10",
  lime: "border-lime/50 bg-lime/10",
  gold: "border-gold/50 bg-gold/10",
};

export function InfrastructureSection() {
  const { ref, isInView } = useScrollAnimation();

  return (
    <section id="infrastructure" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium tracking-wider uppercase bg-lime/10 text-lime border border-lime/20 mb-4">
            Infrastructure
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
            Tamashii Network <span className="gradient-text">Architecture</span>
          </h2>
        </div>

        <div ref={ref} className="max-w-7xl mx-auto space-y-8">
          {/* Top Layer - Services */}
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeInUp}
            className="space-y-4"
          >
            <h3 className="text-2xl font-bold mb-6 text-center text-foreground">
              Services &amp; Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {services.map((service, index) => (
                <motion.div
                  key={service.title}
                  initial="hidden"
                  animate={isInView ? "visible" : "hidden"}
                  variants={fadeInUp}
                  transition={{ delay: index * 0.1 }}
                >
                  <div
                    className={`glass-card h-full border-2 ${accentClasses[service.accent]} p-4 hover:scale-105 transition-transform`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div
                        className={`w-12 h-12 ${accentClasses[service.accent]} rounded-lg flex items-center justify-center mb-3`}
                      >
                        <service.icon className="w-5 h-5 text-foreground" />
                      </div>
                      <h4 className="font-bold text-sm mb-2 text-foreground">
                        {service.title}
                      </h4>
                      <p className="text-xs text-text-muted leading-tight">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Middle Layer - Core Functions */}
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeInUp}
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            <h3 className="text-2xl font-bold mb-6 text-center text-foreground">
              Core Functionality
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {coreFunctions.map((func, index) => (
                <motion.div
                  key={func.title}
                  initial="hidden"
                  animate={isInView ? "visible" : "hidden"}
                  variants={fadeInUp}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  <div className="glass-card border-2 border-lime/50 p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-lime/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <func.icon className="w-5 h-5 text-lime" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-2 text-foreground">
                          {func.title}
                        </h4>
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {func.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Third Layer - EVM Networks */}
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeInUp}
            transition={{ delay: 0.9 }}
            className="space-y-4"
          >
            <h3 className="text-2xl font-bold mb-6 text-center text-foreground">
              EVM-Compatible Networks
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {networks.map((network, index) => (
                <motion.div
                  key={network.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={
                    isInView
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.8 }
                  }
                  transition={{ delay: 1.0 + index * 0.1 }}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg glass-card hover:border-lime transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: network.color }}
                  />
                  <span className="text-sm font-medium text-text-secondary">
                    {network.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Bottom Layer - GPU Infrastructure */}
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeInUp}
            transition={{ delay: 1.2 }}
            className="space-y-4"
          >
            <h3 className="text-2xl font-bold mb-6 text-center text-foreground">
              Decentralized GPU Network
            </h3>
            <div className="glass-card border-2 border-cyan/50 p-6">
              <div className="text-center mb-4">
                <p className="text-text-secondary mb-4">
                  High-performance GPUs from the decentralized network
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {gpuTypes.map((gpu, index) => (
                    <motion.span
                      key={gpu}
                      initial={{ opacity: 0, y: 10 }}
                      animate={
                        isInView
                          ? { opacity: 1, y: 0 }
                          : { opacity: 0, y: 10 }
                      }
                      transition={{ delay: 1.3 + index * 0.05 }}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-cyan/10 text-cyan border border-cyan/20"
                    >
                      {gpu}
                    </motion.span>
                  ))}
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={
                      isInView
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: 10 }
                    }
                    transition={{ delay: 1.5 }}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-cyan/10 text-cyan border border-cyan/20"
                  >
                    + More
                  </motion.span>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-lime mb-1">
                      1000&times;
                    </div>
                    <div className="text-xs text-text-muted">
                      DisTrO Compression
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cyan mb-1">EVM</div>
                    <div className="text-xs text-text-muted">
                      Smart Contract Integration
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple mb-1">
                      Docker
                    </div>
                    <div className="text-xs text-text-muted">
                      Easy Client Deployment
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
