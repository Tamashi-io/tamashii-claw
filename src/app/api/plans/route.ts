import { NextResponse } from "next/server";

const CLAW_API = "https://api.hyperclaw.app";
const API_KEY = () => process.env.HYPERCLI_CLAW_API_KEY || "";

export async function GET() {
  try {
    const res = await fetch(`${CLAW_API}/api/plans`, {
      headers: { Authorization: `Bearer ${API_KEY()}` },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`HyperClaw API ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch plans";
    console.error("[/api/plans]", message);
    return NextResponse.json({ plans: [], error: message }, { status: 502 });
  }
}
