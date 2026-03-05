"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";
import { apiFetch, API_BASE } from "@/lib/api";
import { Plan, formatTokens, formatCpu, formatMemory } from "@/lib/format";

export default function PlansPage() {
  const { getToken } = useTamashiiAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [plansRes, token] = await Promise.all([
          fetch(`${API_BASE}/plans`).then((r) => r.json()),
          getToken(),
        ]);
        setPlans(plansRes.plans ?? []);

        const profile = await apiFetch<{ plan_id?: string }>("/user/profile", token);
        setCurrentPlanId(profile.plan_id ?? null);
      } catch {
        // Plans not available
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getToken]);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-6">Plans</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-6 h-64 animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Plans</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <div
              key={plan.id}
              className={`glass-card p-6 flex flex-col ${
                plan.highlighted
                  ? "border-lime/40 shadow-[0_0_40px_rgba(57,255,20,0.12)]"
                  : ""
              }`}
            >
              {plan.highlighted && (
                <div className="text-xs font-semibold text-primary bg-lime/10 px-3 py-1 rounded-full self-start mb-4">
                  Most Popular
                </div>
              )}

              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-2 mb-1">
                <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                <span className="text-text-muted text-sm">/month</span>
              </div>
              <p className="text-sm text-text-tertiary mb-1">
                {plan.aiu} AIU &middot; {formatTokens(plan.limits.tpd)} tokens/day
              </p>
              <p className="text-xs text-text-muted mb-6">
                Up to {formatTokens(plan.limits.burst_tpm)} TPM burst &middot;{" "}
                {formatTokens(plan.limits.rpm)} RPM
              </p>
              {plan.agent_resources && plan.agent_resources.max_agents > 0 && (
                <p className="text-xs text-text-muted mb-6">
                  {plan.agent_resources.max_agents} agent{plan.agent_resources.max_agents > 1 ? "s" : ""} &middot;{" "}
                  {formatCpu(Number(plan.agent_resources.total_cpu))} &middot;{" "}
                  {formatMemory(Number(plan.agent_resources.total_memory))}
                </p>
              )}

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isCurrent
                    ? "bg-surface-low text-text-muted cursor-default"
                    : plan.highlighted
                      ? "btn-primary"
                      : "btn-secondary"
                }`}
              >
                {isCurrent ? "Current Plan" : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
