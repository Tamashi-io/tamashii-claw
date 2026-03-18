"use client";

import { motion } from "framer-motion";
import { Brain, Globe, Bot, ArrowRight } from "lucide-react";
import { fadeInUp, useScrollAnimation } from "@/hooks/useScrollAnimation";

const modelTypes = [
  {
    icon: Brain,
    title: "Vision-Language-Action",
    subtitle: "VLA Models",
    description:
      "Multimodal models that see, understand, and act. Power robotic control and embodied AI.",
    bgColor: "bg-purple/10",
    textColor: "text-purple",
    borderColor: "border-purple/20 hover:border-purple/50",
  },
  {
    icon: Globe,
    title: "World Models",
    subtitle: "Environment Simulation",
    description:
      "Predictive models that learn physics and dynamics. Enable planning and simulation at scale.",
    bgColor: "bg-cyan/10",
    textColor: "text-cyan",
    borderColor: "border-cyan/20 hover:border-cyan/50",
  },
  {
    icon: Bot,
    title: "AGI Foundation",
    subtitle: "General Intelligence",
    description:
      "Training the next generation of generalist AI systems. Recursive self-improvement loops.",
    bgColor: "bg-lime/10",
    textColor: "text-lime",
    borderColor: "border-lime/20 hover:border-lime/50",
  },
];

export function BeyondLLMsSection() {
  const { ref, isInView } = useScrollAnimation();

  return (
    <section id="beyond-llms" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-cyan/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Not Just <span className="text-text-muted">LLMs</span>
            </h2>
            <p className="text-xl md:text-2xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
              Tamashii trains the full spectrum of AI. From
              vision-language-action models to world simulators and AGI
              foundations.
            </p>
          </motion.div>

          {/* Model Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {modelTypes.map((model, index) => (
              <motion.div
                key={model.title}
                initial={{ opacity: 0, y: 20 }}
                animate={
                  isInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 20 }
                }
                transition={{ delay: 0.2 + index * 0.1 }}
                className={`glass-card rounded-2xl p-8 ${model.borderColor} transition-all duration-300`}
              >
                <div
                  className={`w-14 h-14 ${model.bgColor} rounded-xl flex items-center justify-center mb-6`}
                >
                  <model.icon className={`w-7 h-7 ${model.textColor}`} />
                </div>
                <div className={`text-sm font-medium ${model.textColor} mb-2`}>
                  {model.subtitle}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">
                  {model.title}
                </h3>
                <p className="text-text-secondary leading-relaxed">
                  {model.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={fadeInUp}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <div className="glass-card rounded-2xl p-8 md:p-12 border-lime/20 max-w-3xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                Powering <span className="gradient-text">Physical AI</span>
              </h3>
              <p className="text-text-secondary mb-8 max-w-xl mx-auto">
                From robot brains to autonomous systems. Train models that
                interact with the real world on Tamashii&apos;s distributed
                infrastructure.
              </p>
              <a
                href="https://docs.tamashii.network"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
              >
                Learn More
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
