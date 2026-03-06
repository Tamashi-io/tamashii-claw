import { NextResponse } from "next/server";

const CLAW_API = "https://api.hyperclaw.app";
const API_KEY = () => process.env.HYPERCLI_CLAW_API_KEY || "";

async function clawFetch(path: string) {
  const res = await fetch(`${CLAW_API}${path}`, {
    headers: { Authorization: `Bearer ${API_KEY()}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  try {
    const [plan, usage, usageHistory, keyUsage, agents] = await Promise.all([
      clawFetch("/api/plans/current"),
      clawFetch("/api/usage"),
      clawFetch("/api/usage/history?days=7"),
      clawFetch("/api/usage/keys?days=7"),
      clawFetch("/api/agents"),
    ]);

    const agentItems = agents?.items ?? [];

    return NextResponse.json({
      agents: agentItems,
      keys: keyUsage?.keys ?? [],
      stats: {
        total_tokens: usage?.total_tokens ?? 0,
        total_requests: usage?.total_requests ?? 0,
        active_keys: keyUsage?.keys?.length ?? 0,
        rate_limit_tpm: plan?.limits?.burst_tpm ?? 0,
        rate_limit_rpm: plan?.limits?.rpm ?? 0,
      },
      usage: usageHistory?.history ?? [],
      key_usage: keyUsage?.keys ?? [],
      plan: plan ?? null,
      budget: agents?.budget ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch dashboard";
    console.error("[/api/dashboard]", message);
    return NextResponse.json(
      {
        agents: [],
        keys: [],
        stats: { total_tokens: 0, total_requests: 0, active_keys: 0, rate_limit_tpm: 0, rate_limit_rpm: 0 },
        usage: [],
        key_usage: [],
        error: message,
      },
      { status: 502 }
    );
  }
}
