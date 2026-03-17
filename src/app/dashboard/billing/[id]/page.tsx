"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CreditCard, Coins, CheckCircle, Clock, Copy, Check } from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";
import {
  getBillingPayment,
  getBillingProfile,
  type BillingPayment,
  type BillingProfileFields,
} from "@/lib/billing";

function formatAmount(payment: BillingPayment): string {
  const provider = payment.provider.toLowerCase();
  const raw = Number.parseFloat(payment.amount);
  if (!Number.isFinite(raw)) return "$0.00";

  if (provider === "x402" || payment.currency.toLowerCase() === "usdc") {
    const usdc = raw / 1_000_000;
    return `${usdc.toFixed(6)} USDC`;
  }
  return `$${(raw / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BillingDetailPage() {
  const { getToken } = useTamashiiAuth();
  const params = useParams<{ id: string }>();
  const [payment, setPayment] = useState<BillingPayment | null>(null);
  const [fromLines, setFromLines] = useState<string[]>([]);
  const [paidByLines, setPaidByLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const [paymentData, billingData] = await Promise.all([
          getBillingPayment(token, params.id),
          getBillingProfile(token),
        ]);
        if (cancelled) return;

        const profile: BillingProfileFields | null = billingData.profile;

        const locality = [
          profile?.billing_city,
          profile?.billing_state,
          profile?.billing_postal_code,
        ].filter(Boolean).join(", ");

        const nextPaidByLines = [
          profile?.billing_company || profile?.billing_name || paymentData.user?.email || "Authenticated account",
          profile?.billing_company && profile?.billing_name ? profile.billing_name : null,
          profile?.billing_line1,
          profile?.billing_line2,
          locality || null,
          profile?.billing_country,
          profile?.billing_tax_id ? `Tax ID: ${profile.billing_tax_id}` : null,
          paymentData.user?.email,
        ].filter(Boolean) as string[];

        setPayment(paymentData);
        setPaidByLines(nextPaidByLines);
        setFromLines([
          ...(billingData.company_billing?.address?.length
            ? billingData.company_billing.address
            : ["TamashiiClaw", "Billing"]),
          billingData.company_billing?.email || "",
        ].filter(Boolean));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load receipt");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [getToken, params?.id]);

  const handleCopyId = async () => {
    if (!payment) return;
    await navigator.clipboard.writeText(payment.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/billing" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to billing
        </Link>
        <div className="glass-card px-6 py-10 text-center text-text-muted text-sm">
          Loading receipt...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/billing" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to billing
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/billing" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to billing
        </Link>
        <div className="glass-card px-6 py-10 text-center text-text-muted text-sm">
          Receipt not found.
        </div>
      </div>
    );
  }

  const provider = payment.provider.toLowerCase();
  const status = payment.status.toLowerCase();
  const isCompleted = status === "succeeded" || status === "completed";
  const isX402 = provider === "x402";
  const txHash = isX402 && payment.external_payment_id?.startsWith("0x")
    ? payment.external_payment_id
    : null;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/billing" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Back to billing
      </Link>

      <div className="glass-card p-6">
        {/* Receipt header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Receipt</h1>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs text-text-muted font-mono">{payment.id}</code>
              <button
                onClick={handleCopyId}
                className="text-text-muted hover:text-foreground transition-colors"
              >
                {copiedId ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                isCompleted
                  ? "bg-green-500/10 text-green-400"
                  : "bg-yellow-500/10 text-yellow-400"
              }`}
            >
              {isCompleted ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {isCompleted ? "Completed" : status}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Amount & date */}
          <div className="space-y-4">
            <div>
              <p className="text-xs text-text-muted uppercase mb-1">Amount</p>
              <p className="text-xl font-bold text-foreground font-mono">{formatAmount(payment)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase mb-1">Date</p>
              <p className="text-sm text-foreground">{formatDate(payment.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase mb-1">Payment method</p>
              <div className="inline-flex items-center gap-1.5 text-sm text-foreground">
                {isX402 ? <Coins className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                {isX402 ? "Onchain USDC (x402)" : "Credit Card (Stripe)"}
              </div>
            </div>
            {payment.subscription?.plan_id && (
              <div>
                <p className="text-xs text-text-muted uppercase mb-1">Plan</p>
                <p className="text-sm text-foreground">{payment.subscription.plan_id}</p>
              </div>
            )}
            {txHash && (
              <div>
                <p className="text-xs text-text-muted uppercase mb-1">Transaction</p>
                <a
                  href={`https://basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline font-mono break-all"
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </a>
              </div>
            )}
          </div>

          {/* From / Paid by */}
          <div className="space-y-4">
            <div>
              <p className="text-xs text-text-muted uppercase mb-1">Receipt from</p>
              <div className="space-y-0.5 text-sm text-foreground">
                {fromLines.map((line, i) => <div key={i}>{line}</div>)}
              </div>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase mb-1">Paid by</p>
              <div className="space-y-0.5 text-sm text-foreground">
                {paidByLines.length > 0
                  ? paidByLines.map((line, i) => <div key={i}>{line}</div>)
                  : <div className="text-text-muted">{payment.user_id}</div>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="border-t border-border pt-4">
          <p className="text-xs text-text-muted">
            This receipt reflects subscription billing activity. Save or print this page if you need a durable accounting record.
          </p>
        </div>
      </div>
    </div>
  );
}
