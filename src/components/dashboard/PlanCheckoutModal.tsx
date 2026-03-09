"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Coins, Wallet, Check } from "lucide-react";
import { Plan, formatTokens } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import { connectWallet, getWalletState, x402Subscribe } from "@/lib/x402";

interface PlanCheckoutModalProps {
  plan: Plan;
  isOpen: boolean;
  onClose: () => void;
  getToken: () => Promise<string>;
}

type PaymentMethod = "card" | "crypto";

export function PlanCheckoutModal({
  plan,
  isOpen,
  onClose,
  getToken,
}: PlanCheckoutModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(
    () => getWalletState()?.address ?? null
  );

  const handleClose = () => {
    if (processing) return;
    setError(null);
    setSuccess(false);
    setMethod("card");
    onClose();
  };

  /* ── Stripe card checkout ─────────────────────────────────────────── */
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

  /* ── x402 USDC checkout ───────────────────────────────────────────── */
  const handleConnectWallet = async () => {
    setProcessing(true);
    setError(null);
    try {
      const wallet = await connectWallet();
      setWalletAddress(wallet.address);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to connect wallet"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCrypto = async () => {
    setProcessing(true);
    setError(null);
    try {
      const token = await getToken();
      await x402Subscribe(plan.id, token || undefined);
      setSuccess(true);
      // Auto-close after showing success
      setTimeout(() => {
        handleClose();
        window.location.reload();
      }, 2000);
    } catch (err: unknown) {
      let msg = "Payment failed. Please try again.";
      const axiosErr = err as { response?: { data?: { detail?: unknown } }; message?: string };
      if (axiosErr.response?.data?.detail) {
        msg =
          typeof axiosErr.response.data.detail === "string"
            ? axiosErr.response.data.detail
            : JSON.stringify(axiosErr.response.data.detail);
      } else if (axiosErr.message) {
        msg = axiosErr.message;
      }
      setError(msg);
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
      handleCrypto();
    }
  };

  const buttonLabel = () => {
    if (processing) return "Processing...";
    if (method === "card") return `Pay $${plan.price} with Card`;
    if (!walletAddress) return "Connect Wallet";
    return `Pay $${plan.price} with USDC`;
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
                /* ── Success state ──────────────────────────────────── */
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
                    {(plan.agents ?? 0) > 0 && (
                      <p className="text-sm text-text-tertiary mt-1">
                        {plan.agents} agent{(plan.agents ?? 0) > 1 ? "s" : ""} &middot;{" "}
                        {plan.aiu} AIU
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
                          USDC
                        </div>
                        <div className="text-xs text-text-muted">x402 on Base</div>
                      </button>
                    </div>
                  </div>

                  {/* Crypto wallet status */}
                  {method === "crypto" && (
                    <div className="mb-4 p-3 rounded-lg bg-surface-low/50 border border-border text-sm">
                      {walletAddress ? (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Wallet className="w-4 h-4 text-primary" />
                          <span className="font-mono text-xs">
                            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                          </span>
                          <span className="text-text-muted ml-auto">
                            ${plan.price} USDC on Base
                          </span>
                        </div>
                      ) : (
                        <p className="text-text-muted">
                          Connect your wallet to pay{" "}
                          <span className="text-foreground font-medium">
                            ${plan.price} USDC
                          </span>{" "}
                          on Base.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                      {error}
                    </div>
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
