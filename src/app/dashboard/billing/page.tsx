"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Receipt, CreditCard, Coins, ExternalLink } from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";
import {
  getBillingPayments,
  getBillingProfile,
  updateBillingProfile,
  type BillingProfileFields,
  type BillingPayment,
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
    month: "short",
    day: "numeric",
  });
}

export default function BillingPage() {
  const { getToken } = useTamashiiAuth();
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [billingProfile, setBillingProfile] = useState<BillingProfileFields>({
    billing_name: "",
    billing_company: "",
    billing_tax_id: "",
    billing_line1: "",
    billing_line2: "",
    billing_city: "",
    billing_state: "",
    billing_postal_code: "",
    billing_country: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const [paymentsData, profileData] = await Promise.all([
          getBillingPayments(token),
          getBillingProfile(token),
        ]);
        if (!cancelled) {
          setPayments(paymentsData.items ?? []);
          setBillingProfile({
            billing_name: profileData.profile?.billing_name ?? "",
            billing_company: profileData.profile?.billing_company ?? "",
            billing_tax_id: profileData.profile?.billing_tax_id ?? "",
            billing_line1: profileData.profile?.billing_line1 ?? "",
            billing_line2: profileData.profile?.billing_line2 ?? "",
            billing_city: profileData.profile?.billing_city ?? "",
            billing_state: profileData.profile?.billing_state ?? "",
            billing_postal_code: profileData.profile?.billing_postal_code ?? "",
            billing_country: profileData.profile?.billing_country ?? "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load billing records");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [getToken]);

  const updateField = (field: keyof BillingProfileFields, value: string) => {
    setBillingProfile((cur) => ({ ...cur, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const token = await getToken();
      const result = await updateBillingProfile(token, billingProfile);
      setBillingProfile({
        billing_name: result.profile?.billing_name ?? "",
        billing_company: result.profile?.billing_company ?? "",
        billing_tax_id: result.profile?.billing_tax_id ?? "",
        billing_line1: result.profile?.billing_line1 ?? "",
        billing_line2: result.profile?.billing_line2 ?? "",
        billing_city: result.profile?.billing_city ?? "",
        billing_state: result.profile?.billing_state ?? "",
        billing_postal_code: result.profile?.billing_postal_code ?? "",
        billing_country: result.profile?.billing_country ?? "",
      });
      setSaveMessage(
        result.synced_stripe_customer_ids?.length
          ? `Saved and synced ${result.synced_stripe_customer_ids.length} Stripe customer${result.synced_stripe_customer_ids.length === 1 ? "" : "s"}.`
          : "Saved."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save billing profile");
    } finally {
      setSaving(false);
    }
  };

  const stripeCount = useMemo(
    () => payments.filter((p) => p.provider.toLowerCase() === "stripe").length,
    [payments]
  );
  const x402Count = useMemo(
    () => payments.filter((p) => p.provider.toLowerCase() === "x402").length,
    [payments]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-text-secondary text-sm">
          Receipts for subscription charges and onchain payments.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
            <Receipt className="w-4 h-4" />
            Receipts
          </div>
          <div className="text-2xl font-bold text-foreground">{payments.length}</div>
          <p className="text-xs text-text-muted mt-1">All billing receipts for this account</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
            <CreditCard className="w-4 h-4" />
            Credit Card
          </div>
          <div className="text-2xl font-bold text-foreground">{stripeCount}</div>
          <p className="text-xs text-text-muted mt-1">Stripe subscription payments</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
            <Coins className="w-4 h-4" />
            x402
          </div>
          <div className="text-2xl font-bold text-foreground">{x402Count}</div>
          <p className="text-xs text-text-muted mt-1">Onchain USDC payments on Base</p>
        </div>
      </div>

      {/* Billing details */}
      <div className="glass-card p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Billing details</h2>
          <p className="mt-1 text-sm text-text-secondary">
            These appear on receipts and are synced to Stripe for future invoices.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-text-secondary">Legal name</span>
            <input
              className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              value={billingProfile.billing_name ?? ""}
              onChange={(e) => updateField("billing_name", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-text-secondary">Company</span>
            <input
              className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              value={billingProfile.billing_company ?? ""}
              onChange={(e) => updateField("billing_company", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-text-secondary">Tax ID</span>
            <input
              className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              value={billingProfile.billing_tax_id ?? ""}
              onChange={(e) => updateField("billing_tax_id", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-text-secondary">Address line 1</span>
            <input
              className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              value={billingProfile.billing_line1 ?? ""}
              onChange={(e) => updateField("billing_line1", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-text-secondary">Address line 2</span>
            <input
              className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              value={billingProfile.billing_line2 ?? ""}
              onChange={(e) => updateField("billing_line2", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-text-secondary">City</span>
            <input
              className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              value={billingProfile.billing_city ?? ""}
              onChange={(e) => updateField("billing_city", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-text-secondary">State / region</span>
            <input
              className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              value={billingProfile.billing_state ?? ""}
              onChange={(e) => updateField("billing_state", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-text-secondary">Postal code</span>
            <input
              className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              value={billingProfile.billing_postal_code ?? ""}
              onChange={(e) => updateField("billing_postal_code", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-text-secondary">Country</span>
            <input
              className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              value={billingProfile.billing_country ?? ""}
              onChange={(e) => updateField("billing_country", e.target.value)}
            />
          </label>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save billing details"}
          </button>
          {saveMessage && (
            <span className="text-sm text-green-400">{saveMessage}</span>
          )}
        </div>
      </div>

      {/* Receipts list */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Receipts</h2>
          <p className="text-sm text-text-secondary mt-1">
            Completed subscription payments appear here.
          </p>
        </div>

        {loading ? (
          <div className="glass-card px-6 py-10 text-center text-text-muted text-sm">
            Loading billing records...
          </div>
        ) : payments.length === 0 ? (
          <div className="glass-card px-6 py-10 text-center">
            <Receipt className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary mb-1">No receipts yet</p>
            <p className="text-sm text-text-muted">
              Completed subscription payments will appear here.
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-text-muted uppercase px-6 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase px-6 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase px-6 py-3">Method</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase px-6 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-text-muted uppercase px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => {
                  const provider = payment.provider.toLowerCase();
                  const status = payment.status.toLowerCase();
                  const isCompleted = status === "succeeded" || status === "completed";

                  return (
                    <tr key={payment.id} className="hover:bg-surface-low/50">
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatDate(payment.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground font-mono">
                        {formatAmount(payment)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface-low text-text-secondary">
                          {provider === "stripe" ? (
                            <><CreditCard className="w-3 h-3" /> Card</>
                          ) : (
                            <><Coins className="w-3 h-3" /> x402</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? "bg-green-500/10 text-green-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {isCompleted ? "Completed" : status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/billing/${payment.id}`}
                          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
