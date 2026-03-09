"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Check } from "lucide-react";
import { Plan, formatTokens, formatCpu, formatMemory } from "@/lib/format";
import { apiFetch } from "@/lib/api";

interface PlanCheckoutModalProps {
  plan: Plan;
  isOpen: boolean;
  onClose: () => void;
  getToken: () => Promise<string>;
}

export function PlanCheckoutModal({
  plan,
  isOpen,
  onClose,
  getToken,
}: PlanCheckoutModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (processing) return;
    setError(null);
    onClose();
  };

  const handleCheckout = async () => {
    setProcessing(true);
    setError(null);
    try {
      const token = await getToken();
      const data = await apiFetch<{ checkout_url: string }>(
        "/plans/checkout",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            plan_id: plan.id,
            success_url: `${window.location.origin}/dashboard/plans?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${window.location.origin}${window.location.pathname}?cancelled=true`,
          }),
        }
      );
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create checkout session"
      );
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="glass-card w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  Subscribe to {plan.name}
                </h2>
                <button
                  onClick={handleClose}
                  disabled={processing}
                  className="text-text-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Plan summary */}
              <div className="p-4 rounded-lg bg-surface-low/50 border border-border mb-6">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-foreground font-medium">{plan.name}</span>
                  <span className="text-foreground font-bold">
                    ${plan.price}
                    <span className="text-text-muted text-sm font-normal">/mo</span>
                  </span>
                </div>
                <p className="text-sm text-text-tertiary">
                  {formatTokens(plan.limits.tpd)} tokens/day &middot;{" "}
                  Up to {formatTokens(plan.limits.burst_tpm)} TPM &middot;{" "}
                  {formatTokens(plan.limits.rpm)} RPM
                </p>
                {plan.agent_resources && plan.agent_resources.max_agents > 0 && (
                  <p className="text-sm text-text-tertiary mt-1">
                    {plan.agent_resources.max_agents} agent
                    {plan.agent_resources.max_agents > 1 ? "s" : ""} &middot;{" "}
                    {formatCpu(Number(plan.agent_resources.total_cpu))} &middot;{" "}
                    {formatMemory(Number(plan.agent_resources.total_memory))}
                  </p>
                )}

                {plan.features.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-text-secondary">
                        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  disabled={processing}
                  className="flex-1 btn-secondary px-4 py-3 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={processing}
                  className="flex-1 btn-primary px-4 py-3 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  {processing ? "Redirecting..." : `Pay $${plan.price}`}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
