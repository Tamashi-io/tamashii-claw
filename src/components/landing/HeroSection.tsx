"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const codeSnippet = `curl https://api.tamashiiclaw.app/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "kimi-k2.5",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.35,
  });

  const contentY = useTransform(smoothProgress, [0, 1], [0, -80]);
  const contentOpacity = useTransform(smoothProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center pt-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-grid-pattern" />

      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-lime/5 blur-[120px] rounded-full"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.05, 0.08, 0.05],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative max-w-5xl mx-auto text-center w-full overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-lime/20 bg-lime/5 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-primary font-medium">
            Powered by the Tamashii Network
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-[40px] sm:text-[48px] md:text-[56px] lg:text-[64px] font-bold leading-[0.95] tracking-[-0.03em] mb-6"
        >
          Decentralized Agent{" "}
          <span className="gradient-text-primary">Infrastructure</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-base sm:text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed px-2"
        >
          Deploy autonomous AI agents that run 24/7 on decentralized GPU
          infrastructure. Flat-rate compute, no per-token charges, OpenAI-compatible.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
        >
          <a
            href="/dashboard"
            className="btn-primary px-8 py-3 rounded-lg text-base font-semibold glow-green-subtle"
          >
            Launch App
          </a>
          <a
            href="#features"
            className="btn-secondary px-8 py-3 rounded-lg text-base font-medium"
          >
            How It Works
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center gap-8 sm:gap-12 mb-16"
        >
          {[
            { value: "B200", label: "NVIDIA GPUs" },
            { value: "24/7", label: "Agent Uptime" },
            { value: "EVM", label: "Compatible" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <span className="text-2xl sm:text-3xl font-bold text-foreground">
                {stat.value}
              </span>
              <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card p-1 max-w-2xl mx-auto w-full"
        >
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            <span className="text-xs text-text-muted ml-2">terminal</span>
          </div>
          <pre className="p-4 text-left text-xs sm:text-sm text-text-secondary overflow-x-auto border-0 bg-transparent whitespace-pre-wrap break-all sm:whitespace-pre sm:break-normal">
            <code>{codeSnippet}</code>
          </pre>
        </motion.div>
      </motion.div>

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,5,10,0.4)_70%)]" />
    </section>
  );
}
