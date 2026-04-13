"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Coins, Wallet, Check, Loader2 } from "lucide-react";
import { Plan, formatTokens } from "@/lib/format";
import { apiFetch, getSubscriptionStatus } from "@/lib/api";
import {
  connectEvmWallet,
  getEvmWalletState,
  swapAndSubscribe,
  type SwapStep,
  type CryptoPayToken,
} from "@/lib/x402";

/** Parse nested x402 / facilitator error into a human-readable message. */
function parsePaymentError(raw: string): string {
  const reasonMatch = raw.match(/errorReason[\\"]* *[:=] *[\\"]*(.*?)[\\"]*(?: *[,}])/);
  if (reasonMatch) {
    const reason = reasonMatch[1].replace(/\\\\/g, "");
    if (reason.includes("free_tier_exhausted")) {
      return "The payment facilitator\u2019s free tier is exhausted. Please try again later or use a credit card.";
    }
    if (reason.includes("insufficient")) {
      return "Insufficient funds for this transaction. Please check your balance.";
    }
    return reason;
  }

  const errorMatch = raw.match(/"error"\s*:\s*"([^"]+)"/);
  if (errorMatch) {
    const msg = errorMatch[1];
    if (msg.includes("Settlement failed")) {
      return "Payment settlement failed. Please try again or use a different payment method.";
    }
    return msg;
  }

  if (raw.includes("402")) {
    return "Payment required but could not be processed. Please try a different payment method.";
  }

  return "Payment failed. Please try again.";
}

interface PlanCheckoutModalProps {
  plan: Plan;
  isOpen: boolean;
  onClose: () => void;
  getToken: () => Promise<string>;
}

type PaymentMethod = "card" | "crypto";

const SWAP_STEP_LABELS: Record<SwapStep, string> = {
  idle: "",
  quoting: "Getting swap quote...",
  approving: "Approve token spend...",
  swapping: "Confirm in wallet...",
  bridging: "Bridging to Base...",
  subscribing: "Activating subscription...",
  done: "Done!",
  error: "Failed",
};

const PENDING_RETRY_KEY = "pendingCryptoRetry";

export function PlanCheckoutModal({
  plan,
  isOpen,
  onClose,
  getToken,
}: PlanCheckoutModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [cryptoPayToken, setCryptoPayToken] = useState<CryptoPayToken>("bnb");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [swapStep, setSwapStep] = useState<SwapStep>("idle");
  const [hasPendingRetry, setHasPendingRetry] = useState(
    () => sessionStorage.getItem(PENDING_RETRY_KEY) === plan.id,
  );
  const [walletAddress, setWalletAddress] = useState<string | null>(
    () => getEvmWalletState()?.address ?? null,
  );

  const handleClose = () => {
    if (processing) return;
    setError(null);
    setSuccess(false);
    setMethod("card");
    setCryptoPayToken("bnb");
    setSwapStep("idle");
    onClose();
  };

  /* -- Stripe card checkout ------------------------------------------------ */
  const handleCard = async () => {
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
        },
      );
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create checkout session",
      );
      setProcessing(false);
    }
  };

  /* -- Connect EVM wallet -------------------------------------------------- */
  const handleConnectWallet = async () => {
    setProcessing(true);
    setError(null);
    try {
      const wallet = await connectEvmWallet();
      setWalletAddress(wallet.address);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to connect wallet. Is MetaMask installed?",
      );
    } finally {
      setProcessing(false);
    }
  };

  /* -- Direct subscribe (retry when derived wallet already funded) ---------- */
  const handleDirectSubscribe = async () => {
    setProcessing(true);
    setError(null);
    setSwapStep("subscribing");
    try {
      const token = await getToken();
      const HYPERCLAW_AMOUNTS: Record<string, number> = {
        "1aiu": 20.40, "2aiu": 40, "5aiu": 100, "10aiu": 200,
      };
      const hcAmount = HYPERCLAW_AMOUNTS[plan.id] ?? plan.price;
      const amountUsdc = String(Math.round(hcAmount * 1_000_000));
      const result = await apiFetch(`/x402/subscribe/${plan.id}`, token, {
        method: "POST",
        body: JSON.stringify({ amount: amountUsdc }),
      });
      console.log("[checkout] Direct subscribe result:", result);
      sessionStorage.removeItem(PENDING_RETRY_KEY);
      setHasPendingRetry(false);
      setSuccess(true);
      setTimeout(() => { handleClose(); window.location.reload(); }, 2000);
    } catch (err) {
      setSwapStep("error");
      const raw = err instanceof Error ? err.message : String(err);
      setError(parsePaymentError(raw));
    } finally {
      setProcessing(false);
    }
  };

  /* -- EVM swap via LI.FI -------------------------------------------------- */
  const handleCryptoSolana = async () => {
    setProcessing(true);
    setError(null);
    setSwapStep("quoting");
    try {
      const token = await getToken();
      console.log("[checkout] Starting swap-subscribe for plan:", plan.id, "token:", cryptoPayToken);
      const result = await swapAndSubscribe(
        plan.id,
        plan.price,
        token || undefined,
        (step) => {
          console.log("[checkout] Swap step:", step);
          setSwapStep(step);
          if (step === "subscribing") {
            sessionStorage.setItem(PENDING_RETRY_KEY, plan.id);
            setHasPendingRetry(true);
          }
        },
        cryptoPayToken,
      );
      console.log("[checkout] Swap-subscribe result:", result);

      try {
        const sub = await getSubscriptionStatus(token);
        console.log("[checkout] Subscription status from DB:", sub);
      } catch (err) {
        console.warn("[checkout] Could not verify subscription status:", err);
      }

      sessionStorage.removeItem(PENDING_RETRY_KEY);
      setHasPendingRetry(false);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        window.location.reload();
      }, 2000);
    } catch (err: unknown) {
      setSwapStep("error");
      const raw = err instanceof Error ? err.message : String(err);
      console.error("[checkout] Swap-subscribe failed:", raw);
      setError(parsePaymentError(raw));
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = () => {
    if (method === "card") {
      handleCard();
    } else if (!walletAddress) {
      handleConnectWallet();
    } else {
      handleCryptoSolana();
    }
  };

  const displayPrice = plan.price;

  const buttonLabel = () => {
    if (processing && swapStep !== "idle") return SWAP_STEP_LABELS[swapStep];
    if (processing) return "Processing...";
    if (method === "card") return `Pay $${displayPrice} with Card`;
    if (!walletAddress) return "Connect Wallet";
    const tokenLabel = cryptoPayToken === "bnb" ? "BNB" : "USDC";
    return `Swap ${tokenLabel} & Pay $${displayPrice}`;
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

              {success ? (
                /* -- Success state -- */
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Subscription Active!
                  </h3>
                  <p className="text-text-secondary">
                    Your {plan.name} plan is now active.
                  </p>
                </div>
              ) : (
                <>
                  {/* Plan summary */}
                  <div className="p-4 rounded-lg bg-surface-low/50 border border-border mb-6">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-foreground font-medium">
                        {plan.name}
                      </span>
                      <span className="text-foreground font-bold">
                        ${displayPrice}
                        <span className="text-text-muted text-sm font-normal">
                          /mo
                        </span>
                      </span>
                    </div>
                    <p className="text-sm text-text-tertiary">
                      {formatTokens(plan.limits.tpd)} tokens/day &middot;{" "}
                      Up to {formatTokens(plan.limits.burst_tpm)} TPM &middot;{" "}
                      {formatTokens(plan.limits.rpm)} RPM
                    </p>
                    {(plan.agents ?? 0) > 0 && (
                      <p className="text-sm text-text-tertiary mt-1">
                        {plan.agents} agent{(plan.agents ?? 0) > 1 ? "s" : ""}{" "}
                        &middot; {plan.aiu} AIU
                      </p>
                    )}
                  </div>

                  {/* Payment method selector */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setMethod("card")}
                        disabled={processing}
                        className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                          method === "card"
                            ? "border-primary/60 bg-primary/10"
                            : "border-border hover:border-border-medium"
                        } disabled:opacity-50`}
                      >
                        <CreditCard className="w-5 h-5 text-foreground" />
                        <div className="text-sm font-medium text-foreground">
                          Credit Card
                        </div>
                        <div className="text-xs text-text-muted">Stripe</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMethod("crypto")}
                        disabled={processing}
                        className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                          method === "crypto"
                            ? "border-primary/60 bg-primary/10"
                            : "border-border hover:border-border-medium"
                        } disabled:opacity-50`}
                      >
                        <Coins className="w-5 h-5 text-foreground" />
                        <div className="text-sm font-medium text-foreground">
                          BNB &amp; Base
                        </div>
                        <div className="text-xs text-text-muted">
                          BNB or USDC
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Token selector (crypto only) */}
                  {method === "crypto" && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-text-secondary mb-2">
                        Pay with
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCryptoPayToken("bnb")}
                          disabled={processing}
                          className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            cryptoPayToken === "bnb"
                              ? "border-primary/60 bg-primary/10 text-foreground"
                              : "border-border text-text-muted hover:border-border-medium"
                          } disabled:opacity-50`}
                        >
                          <span className="w-4 h-4 rounded-full bg-gradient-to-br from-[#F3BA2F] to-[#F0B90B] inline-block" />
                          BNB
                        </button>
                        <button
                          type="button"
                          onClick={() => setCryptoPayToken("usdc")}
                          disabled={processing}
                          className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            cryptoPayToken === "usdc"
                              ? "border-[#2775CA]/60 bg-[#2775CA]/10 text-foreground"
                              : "border-border text-text-muted hover:border-border-medium"
                          } disabled:opacity-50`}
                        >
                          <span className="text-base">$</span>
                          USDC
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Wallet status */}
                  {method === "crypto" && (
                    <div className="mb-4 p-3 rounded-lg bg-surface-low/50 border border-border text-sm">
                      {walletAddress ? (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Wallet className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="font-mono text-xs">
                            {walletAddress.slice(0, 6)}...
                            {walletAddress.slice(-4)}
                          </span>
                          <span className="text-text-muted ml-auto">
                            {cryptoPayToken === "bnb"
                              ? `~$${displayPrice} in BNB`
                              : `${displayPrice} USDC`}
                            {" \u2192 Base"}
                          </span>
                        </div>
                      ) : (
                        <p className="text-text-muted">
                          Connect your wallet to pay{" "}
                          <span className="text-foreground font-medium">
                            {cryptoPayToken === "bnb"
                              ? `~$${displayPrice} in BNB`
                              : `$${displayPrice} USDC on Base`}
                          </span>.
                          <span className="block text-xs mt-1 text-text-tertiary">
                            {cryptoPayToken === "bnb"
                              ? "BNB will be swapped & bridged to Base USDC via LI.FI."
                              : "USDC sent directly on Base."}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Swap progress indicator */}
                  {method === "crypto" && swapStep !== "idle" && (
                    <div className="mb-4 p-3 rounded-lg bg-surface-low/50 border border-border">
                      <div className="flex items-center gap-2 text-sm">
                        {swapStep !== "done" && swapStep !== "error" && (
                          <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                        )}
                        {swapStep === "done" && (
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        )}
                        <span
                          className={
                            swapStep === "error"
                              ? "text-destructive"
                              : "text-text-secondary"
                          }
                        >
                          {SWAP_STEP_LABELS[swapStep]}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  {/* Retry without re-sending USDC (when derived wallet is pre-funded) */}
                  {method === "crypto" && (swapStep === "error" || hasPendingRetry) && (
                    <button
                      onClick={handleDirectSubscribe}
                      disabled={processing}
                      className="w-full py-2.5 rounded-lg text-sm font-medium btn-outline disabled:opacity-50 mb-2"
                    >
                      Retry without re-sending USDC
                    </button>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={processing}
                    className="w-full py-3 rounded-lg text-sm font-semibold btn-primary disabled:opacity-50"
                  >
                    {buttonLabel()}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
