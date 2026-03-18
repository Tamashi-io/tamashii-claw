"use client";

import { motion } from "framer-motion";
import { Building2, Moon, DollarSign } from "lucide-react";
import { fadeInUp, useScrollAnimation } from "@/hooks/useScrollAnimation";

const problems = [
  {
    icon: Building2,
    title: "Centralized Control",
    description:
      "Training large AI models costs $100M+. Only big tech can afford it, creating gatekeepers.",
  },
  {
    icon: Moon,
    title: "Wasted Compute",
    description:
      "Millions of GPUs sit idle 90% of the time. That's trillions of FLOPs going to waste.",
  },
  {
    icon: DollarSign,
    title: "Expensive Access",
    description:
      "Cloud GPU prices are 3-5\u00d7 higher than actual costs. Developers pay the premium.",
  },
];

export function ProblemSection() {
  const { ref, isInView } = useScrollAnimation();

  return (
    <section id="problem" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium tracking-wider uppercase bg-lime/10 text-lime border border-lime/20 mb-4">
            The Problem
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
            AI Training is <span className="gradient-text">Broken</span>
          </h2>
        </div>

        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
        >
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              variants={fadeInUp}
              transition={{ delay: index * 0.1 }}
            >
              <div className="glass-card h-full group relative overflow-hidden border-2 border-border hover:border-lime transition-all duration-300 p-8">
                {/* Gradient Top Border */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-lime to-cyan opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="mb-4 flex items-center justify-center h-12">
                  <div className="w-12 h-12 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center">
                    <problem.icon className="w-6 h-6 text-lime" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">
                  {problem.title}
                </h3>
                <p className="text-text-secondary leading-relaxed">
                  {problem.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
