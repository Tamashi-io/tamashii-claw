"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";
import { apiFetch, API_BASE } from "@/lib/api";
import { Plan, formatTokens } from "@/lib/format";
import { PlanCheckoutModal } from "@/components/dashboard/PlanCheckoutModal";

// TamashiiClaw plan definitions — HyperClaw price + $5 markup.
// IDs match HyperClaw: 1aiu, 2aiu, 5aiu, 10aiu
// Limits from HyperClaw API, features are ours.
const TAMASHII_PLANS: Plan[] = [
  {
    id: "1aiu",
    name: "1 Agent",
    price: 25,
    aiu: 1,
    features: [
      "1 AIU allocation",
      "50M tokens/day",
      "1 agent (2 vCPU, 2 GiB)",
      "OpenAI-compatible API",
      "Telegram, Slack & Discord",
      "Email support",
    ],
    models: ["kimi-k2.5", "glm-5", "minimax-m2.5"],
    highlighted: false,
    limits: { tpd: 50_000_000, tpm: 34_722, burst_tpm: 1_736_100, rpm: 173 },
    agents: 1,
  },
  {
    id: "2aiu",
    name: "2 Agents",
    price: 45,
    aiu: 2,
    features: [
      "2 AIU allocation",
      "100M tokens/day",
      "1 agent (2 vCPU, 4 GiB)",
      "OpenAI-compatible API",
      "Telegram, Slack & Discord",
      "Priority support",
    ],
    models: ["kimi-k2.5", "glm-5", "minimax-m2.5"],
    highlighted: false,
    limits: { tpd: 100_000_000, tpm: 69_444, burst_tpm: 3_472_200, rpm: 347 },
    agents: 1,
  },
  {
    id: "5aiu",
    name: "5 Agents",
    price: 105,
    aiu: 5,
    features: [
      "5 AIU allocation",
      "250M tokens/day",
      "Up to 3 agents (6 vCPU, 8 GiB total)",
      "OpenAI-compatible API",
      "Telegram, Slack & Discord",
      "Priority support",
      "Usage analytics",
    ],
    models: ["kimi-k2.5", "glm-5", "minimax-m2.5"],
    highlighted: true,
    limits: { tpd: 250_000_000, tpm: 173_611, burst_tpm: 8_680_550, rpm: 868 },
    agents: 3,
  },
  {
    id: "10aiu",
    name: "10 Agents",
    price: 205,
    aiu: 10,
    features: [
      "10 AIU allocation",
      "500M tokens/day",
      "Up to 5 agents (12 vCPU, 16 GiB total)",
      "OpenAI-compatible API",
      "Telegram, Slack & Discord",
      "Dedicated support",
      "Usage analytics",
      "Custom models",
    ],
    models: ["kimi-k2.5", "glm-5", "minimax-m2.5"],
    highlighted: false,
    limits: { tpd: 500_000_000, tpm: 347_222, burst_tpm: 17_361_100, rpm: 2_000 },
    agents: 5,
  },
];

export default function PlansPage() {
  const { getToken } = useTamashiiAuth();
  const [plans, setPlans] = useState<Plan[]>(TAMASHII_PLANS);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();

        // Merge HyperClaw limits into our plan definitions if available
        try {
          const plansRes = await fetch(`${API_BASE}/plans`).then((r) => r.json());
          const hcPlans: Plan[] = plansRes.plans ?? [];
          if (hcPlans.length > 0) {
            setPlans(
              TAMASHII_PLANS.map((tp) => {
                const hc = hcPlans.find((h) => h.id === tp.id);
                if (!hc) return tp;
                return {
                  ...tp,
                  limits: hc.limits ?? tp.limits,
                  agents: hc.agents ?? tp.agents,
                  aiu: hc.aiu ?? tp.aiu,
                  models: hc.models ?? tp.models,
                };
              }),
            );
          }
        } catch {
          // Use hardcoded plans
        }

        const currentPlan = await apiFetch<{ id?: string; plan_id?: string }>("/plans/current", token).catch(() => null);
        setCurrentPlanId(currentPlan?.id ?? currentPlan?.plan_id ?? null);
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
              {(plan.agents ?? 0) > 0 && (
                <p className="text-xs text-text-muted mb-6">
                  {plan.agents} agent{(plan.agents ?? 0) > 1 ? "s" : ""} included
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
                onClick={() => !isCurrent && setCheckoutPlan(plan)}
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

      {checkoutPlan && (
        <PlanCheckoutModal
          plan={checkoutPlan}
          isOpen={true}
          onClose={() => setCheckoutPlan(null)}
          getToken={getToken}
        />
      )}
    </div>
  );
}
