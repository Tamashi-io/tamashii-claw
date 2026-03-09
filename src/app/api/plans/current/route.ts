import { NextResponse } from "next/server";

const CLAW_API = "https://api.hyperclaw.app";
const API_KEY = () => process.env.HYPERCLI_CLAW_API_KEY || "";

/**
 * GET /api/plans/current
 * Returns the current active plan for this account.
 */
export async function GET() {
  try {
    const res = await fetch(`${CLAW_API}/api/plans/current`, {
      headers: { Authorization: `Bearer ${API_KEY()}` },
    });

    if (!res.ok) {
      throw new Error(`HyperClaw API ${res.status}: ${await res.text()}`);
    }

    return NextResponse.json(await res.json());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch current plan";
    console.error("[/api/plans/current]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
