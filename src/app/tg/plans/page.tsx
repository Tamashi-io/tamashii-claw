"use client";

import { useCallback, useEffect, useState } from "react";
import { useTelegramAuth } from "@/components/TelegramAuthProvider";
import { apiFetch } from "@/lib/api";
import { Check, Loader2, Crown } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  aiu: number;
  agents: number;
  tpd: string;
  features: string[];
  highlighted?: boolean;
}

// HyperClaw net amounts (excl. $5 platform fee)
const HYPERCLAW_AMOUNTS: Record<string, number> = {
  "1aiu": 20_400_000,
  "5aiu": 100_000_000,
  "10aiu": 200_000_000,
};

export default function TgPlansPage() {
  const { getToken } = useTelegramAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      const token = await getToken();
      const [plansRes, currentRes] = await Promise.all([
        apiFetch<Plan[]>("/plans", token),
        apiFetch<any>("/plans/current", token),
      ]);
      setPlans(Array.isArray(plansRes) ? plansRes : []);
      setCurrentPlanId(currentRes?.id ?? null);
    } catch (err) {
      console.error("[tg-plans] Load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const subscribe = async (plan: Plan) => {
    const amountUsdc = HYPERCLAW_AMOUNTS[plan.id];
    if (!amountUsdc) {
      alert("This plan is not available for purchase in Telegram yet.");
      return;
    }

    setSubscribing(plan.id);
    try {
      const token = await getToken();
      const res = await apiFetch<any>(`/x402/subscribe/${plan.id}`, token, {
        method: "POST",
        body: JSON.stringify({ amountUsdc: String(amountUsdc) }),
      });

      if (res.key || res.ok) {
        alert(`Subscribed to ${plan.name}! Your API key has been activated.`);
        await loadPlans();
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("insufficient_funds")) {
        alert("Insufficient USDC balance in the operator wallet.");
      } else {
        alert(`Subscription failed: ${msg}`);
      }
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pt-4">
        <h1 className="text-lg font-bold mb-4">Plans</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/5 rounded-xl p-6 animate-pulse h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-lg font-bold mb-1">Plans</h1>
      <p className="text-gray-400 text-xs mb-4">
        Subscribe to deploy agents with built-in inference
      </p>

      <div className="space-y-3">
        {plans
          .filter((p) => HYPERCLAW_AMOUNTS[p.id])
          .map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isSubscribing = subscribing === plan.id;

            return (
              <div
                key={plan.id}
                className={`rounded-xl p-4 border ${
                  plan.highlighted
                    ? "bg-cyan-500/10 border-cyan-500/30"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {plan.highlighted && <Crown className="w-4 h-4 text-cyan-400" />}
                    <h3 className="text-sm font-bold">{plan.name}</h3>
                  </div>
                  <span className="text-lg font-bold">
                    ${plan.price}
                    <span className="text-xs text-gray-400 font-normal">/mo</span>
                  </span>
                </div>

                <div className="text-xs text-gray-400 mb-3 space-y-1">
                  <p>{plan.agents} agent{plan.agents > 1 ? "s" : ""} &middot; {plan.tpd} TPD</p>
                  {plan.features?.slice(0, 3).map((f, i) => (
                    <p key={i} className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                      {f}
                    </p>
                  ))}
                </div>

                {isCurrent ? (
                  <div className="bg-green-500/20 text-green-400 rounded-lg py-2 text-center text-xs font-medium">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => subscribe(plan)}
                    disabled={!!subscribing}
                    className="w-full bg-cyan-500 text-white rounded-lg py-2 text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubscribing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      `Subscribe — $${plan.price}`
                    )}
                  </button>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
