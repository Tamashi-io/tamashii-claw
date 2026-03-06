import { NextResponse } from "next/server";

const CLAW_API = "https://api.hyperclaw.app";
const API_KEY = () => process.env.HYPERCLI_CLAW_API_KEY || "";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const res = await fetch(`${CLAW_API}/api/agents/${id}/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY()}` },
    });

    if (!res.ok) {
      throw new Error(`HyperClaw API ${res.status}: ${await res.text()}`);
    }

    return NextResponse.json(await res.json());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to start agent";
    console.error(`[/api/agents/${id}/start]`, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
