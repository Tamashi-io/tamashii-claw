"use client";

import { useCallback, useEffect, useState } from "react";
import { useTelegramAuth } from "@/components/TelegramAuthProvider";
import { apiFetch } from "@/lib/api";
import { Check, Loader2, Crown, Wallet } from "lucide-react";
import { TonConnectButton, useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  aiu: number;
  agents: number;
  tpd: number | string;
  features: string[];
  highlighted?: boolean;
}

// HyperClaw net amounts in USDC 6-decimal units (excl. $5 platform fee)
const HYPERCLAW_AMOUNTS: Record<string, number> = {
  "1aiu": 20_400_000,   // $20.40
  "2aiu": 40_000_000,   // $40
  "5aiu": 100_000_000,  // $100
  "10aiu": 200_000_000, // $200
};

function formatTpd(tpd: number | string): string {
  const n = typeof tpd === "string" ? parseInt(tpd) : tpd;
  if (isNaN(n)) return String(tpd);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

type PaymentStep =
  | "idle"
  | "quoting"
  | "confirming"
  | "swapping"
  | "activating"
  | "done"
  | "error";

export default function TgPlansPage() {
  const { getToken } = useTelegramAuth();
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("idle");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [tonAmount, setTonAmount] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      const token = await getToken();
      const [plansRes, currentRes] = await Promise.all([
        apiFetch<any>("/plans", token),
        apiFetch<any>("/plans/current", token),
      ]);
      const plansList = Array.isArray(plansRes) ? plansRes : (plansRes?.plans ?? []);
      setPlans(plansList);
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
    if (!HYPERCLAW_AMOUNTS[plan.id]) {
      alert("This plan is not available yet.");
      return;
    }

    if (!tonAddress) {
      // Prompt wallet connection
      tonConnectUI.openModal();
      return;
    }

    setPayingPlanId(plan.id);
    setPaymentStep("quoting");
    setPaymentError(null);

    try {
      const token = await getToken();

      // Step 1: Get swap quote from Symbiosis (TON USDT → Base USDC)
      console.log("[tg-pay] Getting USDT swap quote...");
      const quote = await apiFetch<{
        planId: string;
        usdtAmount: string;
        usdcAmount: string;
        tx: any;
      }>("/swap/ton-quote", token, {
        method: "POST",
        body: JSON.stringify({
          planId: plan.id,
          fromAddress: tonAddress,
        }),
      });

      const usdtDisplay = (parseInt(quote.usdtAmount) / 1_000_000).toFixed(2);
      setTonAmount(usdtDisplay);
      setPaymentStep("confirming");

      console.log(`[tg-pay] Quote: ${usdtDisplay} USDT → $${plan.price} USDC`);

      // Step 2: Send USDT transaction via TON Connect
      // Symbiosis returns TON transaction data (messages array with jetton transfer BOC)
      if (!quote.tx) {
        throw new Error("No transaction data from swap quote");
      }

      // The Symbiosis tx object contains messages ready for TON Connect
      const messages = Array.isArray(quote.tx.messages)
        ? quote.tx.messages
        : [{
            address: quote.tx.to,
            amount: quote.tx.value || "200000000", // 0.2 TON for gas
            payload: quote.tx.data,
          }];

      setPaymentStep("swapping");
      console.log("[tg-pay] Sending USDT transaction via TON Connect...");

      const txResult = await tonConnectUI.sendTransaction({
        validUntil: quote.tx.validUntil || Math.floor(Date.now() / 1000) + 600,
        messages,
      });

      const txHash = txResult.boc;
      console.log("[tg-pay] TON tx sent:", txHash?.slice(0, 20) + "...");

      // Step 3: Track swap + activate subscription on backend
      setPaymentStep("activating");
      console.log("[tg-pay] Waiting for swap + activating plan...");

      const result = await apiFetch<any>("/x402/ton-subscribe", token, {
        method: "POST",
        body: JSON.stringify({
          planId: plan.id,
          txHash,
          amount: String(HYPERCLAW_AMOUNTS[plan.id]),
        }),
      });

      setPaymentStep("done");
      console.log("[tg-pay] Plan activated!", result);

      // Refresh plans
      await loadPlans();

      setTimeout(() => {
        setPaymentStep("idle");
        setPayingPlanId(null);
        setTonAmount(null);
      }, 2000);
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error("[tg-pay] Payment failed:", msg);
      setPaymentError(msg);
      setPaymentStep("error");

      setTimeout(() => {
        setPaymentStep("idle");
        setPayingPlanId(null);
        setPaymentError(null);
        setTonAmount(null);
      }, 5000);
    }
  };

  const stepLabel = (step: PaymentStep): string => {
    switch (step) {
      case "quoting": return "Getting price...";
      case "confirming": return `Confirm ${tonAmount} USDT`;
      case "swapping": return "Bridging USDT → USDC...";
      case "activating": return "Activating plan...";
      case "done": return "Plan activated!";
      case "error": return "Payment failed";
      default: return "";
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
        Pay with USDT from your TON wallet
      </p>

      {/* Wallet Connection */}
      <div className="mb-4">
        {tonAddress ? (
          <div className="bg-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-300">
                {tonAddress.slice(0, 6)}...{tonAddress.slice(-4)}
              </span>
            </div>
            <TonConnectButton className="ton-connect-btn-sm" />
          </div>
        ) : (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-300 mb-3">Connect your TON wallet to subscribe</p>
            <TonConnectButton />
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="space-y-3">
        {plans
          .filter((p) => HYPERCLAW_AMOUNTS[p.id])
          .map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isPaying = payingPlanId === plan.id;

            return (
              <div
                key={plan.id}
                className={`rounded-xl p-4 border ${
                  plan.highlighted
                    ? "bg-orange-500/10 border-orange-500/30"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {plan.highlighted && <Crown className="w-4 h-4 text-orange-400" />}
                    <h3 className="text-sm font-bold">{plan.name}</h3>
                  </div>
                  <span className="text-lg font-bold">
                    ${plan.price}
                    <span className="text-xs text-gray-400 font-normal">/mo</span>
                  </span>
                </div>

                <div className="text-xs text-gray-400 mb-3 space-y-1">
                  <p>{plan.agents} agent{plan.agents > 1 ? "s" : ""} &middot; {formatTpd(plan.tpd)} TPD</p>
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
                ) : isPaying ? (
                  <div className={`rounded-lg py-2 text-center text-xs font-medium flex items-center justify-center gap-2 ${
                    paymentStep === "done"
                      ? "bg-green-500/20 text-green-400"
                      : paymentStep === "error"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-orange-500/20 text-orange-400"
                  }`}>
                    {paymentStep !== "done" && paymentStep !== "error" && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    {stepLabel(paymentStep)}
                  </div>
                ) : (
                  <button
                    onClick={() => subscribe(plan)}
                    disabled={!!payingPlanId}
                    className="w-full bg-orange-500 text-white rounded-lg py-2 text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-3 h-3" />
                    {tonAddress ? `Pay with USDT — $${plan.price}` : "Connect Wallet"}
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {paymentError && (
        <p className="text-center text-xs text-red-400 mt-3 px-2">
          {paymentError.length > 100 ? paymentError.slice(0, 100) + "..." : paymentError}
        </p>
      )}
    </div>
  );
}
