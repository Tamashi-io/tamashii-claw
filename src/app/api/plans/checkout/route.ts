import { NextResponse } from "next/server";

const CLAW_API = "https://api.hyperclaw.app";
const API_KEY = () => process.env.HYPERCLI_CLAW_API_KEY || "";

/**
 * POST /api/plans/checkout
 * Proxies to HyperClaw's Stripe checkout endpoint.
 * Body: { plan_id, success_url, cancel_url }
 * Returns: { checkout_url }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan_id, success_url, cancel_url } = body;

    if (!plan_id) {
      return NextResponse.json({ error: "plan_id is required" }, { status: 400 });
    }

    const res = await fetch(`${CLAW_API}/api/stripe/${plan_id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ success_url, cancel_url }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HyperClaw API ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    console.error("[/api/plans/checkout]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
