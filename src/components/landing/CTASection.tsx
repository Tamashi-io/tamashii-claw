"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { fadeInUp, staggerContainer } from "@/hooks/useScrollAnimation";

export function CTASection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] bg-lime/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl md:text-6xl font-bold mb-6 text-foreground"
          >
            Start Building <span className="gradient-text">Today</span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-xl md:text-2xl text-text-secondary mb-10"
          >
            Join the decentralized AI revolution. Deploy agents, access frontier
            models, and earn on the network.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="https://claw.tamashii.io/dashboard"
              className="btn-primary px-8 py-3 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
            >
              Launch App
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://docs.tamashii.network"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-8 py-3 rounded-lg text-sm font-semibold"
            >
              Read Docs
            </a>
            <a
              href="https://discord.gg/mVtgPRFh"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-8 py-3 rounded-lg text-sm font-semibold"
            >
              Join Discord
            </a>
            <a
              href="https://t.me/+kXkvycledo1kNmM1"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-8 py-3 rounded-lg text-sm font-semibold"
            >
              Join Telegram
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
