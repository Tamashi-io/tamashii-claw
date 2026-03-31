"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="section-dark py-24 md:py-32 relative overflow-hidden" id="contact">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
            Deploy Your First <span className="gradient-text">Agent</span>
          </h2>
          <p className="text-xl md:text-2xl text-text-secondary mb-10">
            Autonomous AI agents on decentralized GPUs. Start building in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard/agents"
              className="btn-primary px-8 py-3 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
            >
              Launch Agent
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard/keys"
              className="btn-secondary px-8 py-3 rounded-lg text-sm font-semibold"
            >
              Get API Key
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
