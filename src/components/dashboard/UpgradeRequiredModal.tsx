"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Plan, formatTokens } from "@/lib/format";
import { PlanCheckoutModal } from "./PlanCheckoutModal";

interface UpgradeRequiredModalProps {
  isOpen: boolean;
  reason: string;
  onClose: () => void;
  getToken: () => Promise<string>;
  currentPlanId?: string | null;
}

export function UpgradeRequiredModal({
  isOpen,
  reason,
  onClose,
  getToken,
  currentPlanId,
}: UpgradeRequiredModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${API_BASE}/plans`)
      .then((r) => r.json())
      .then((data) => setPlans(data.plans ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Only show plans that support agents and are upgrades from current.
  // The API returns `agents` (flat number) — not `agent_resources`.
  const upgradePlans = plans.filter(
    (p) => (p.agents ?? 0) > 0 && p.id !== currentPlanId
  );

  if (checkoutPlan) {
    return (
      <PlanCheckoutModal
        plan={checkoutPlan}
        isOpen={true}
        onClose={() => setCheckoutPlan(null)}
        getToken={getToken}
      />
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="glass-card w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">
                    Upgrade Required
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-text-muted hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-text-secondary mb-6 ml-10">
                {reason}
              </p>

              {/* Plans */}
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 rounded-lg animate-shimmer" />
                  ))}
                </div>
              ) : upgradePlans.length === 0 ? (
                <div className="p-6 rounded-lg bg-surface-low/50 border border-border text-center">
                  <p className="text-sm text-text-muted">
                    No upgrade plans available. Please contact support.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upgradePlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-4 rounded-lg border transition-all ${
                        plan.highlighted
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-surface-low/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-semibold">
                              {plan.name}
                            </span>
                            {plan.highlighted && (
                              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                Popular
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">
                            {formatTokens(plan.limits.tpd)} tokens/day &middot;{" "}
                            {plan.agents} agent{(plan.agents ?? 0) > 1 ? "s" : ""} &middot;{" "}
                            {plan.aiu} AIU
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-foreground font-bold">
                            ${plan.price}
                            <span className="text-text-muted text-xs font-normal">
                              /mo
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setCheckoutPlan(plan)}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-all mt-2 ${
                          plan.highlighted ? "btn-primary" : "btn-secondary"
                        }`}
                      >
                        Upgrade to {plan.name}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full mt-4 py-2 text-sm text-text-muted hover:text-foreground transition-colors"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
