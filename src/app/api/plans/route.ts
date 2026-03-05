import { NextResponse } from "next/server";
import { getClient } from "@/lib/hypercli";

export async function GET() {
  try {
    const client = getClient();
    const clawPlans = await client.claw.plans();

    // Translate SDK ClawPlan → frontend Plan format
    const plans = clawPlans.map((p, idx) => ({
      id: p.id,
      name: p.name,
      price: p.priceUsd,
      aiu: Math.ceil(p.tpmLimit / 150_000) || 1,
      features: [
        "All frontier models",
        "OpenAI-compatible API",
        `${formatTpm(p.tpmLimit)} TPM`,
        `${formatTpm(p.rpmLimit)} RPM`,
      ],
      models: [],
      highlighted: idx === 1,
      limits: {
        tpd: p.tpmLimit * 60 * 24,
        tpm: p.tpmLimit,
        burst_tpm: p.tpmLimit * 4,
        rpm: p.rpmLimit,
      },
    }));

    return NextResponse.json({ plans });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch plans";
    return NextResponse.json({ plans: [], error: message }, { status: 502 });
  }
}

function formatTpm(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}
