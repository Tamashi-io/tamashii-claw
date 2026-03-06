import { NextResponse } from "next/server";

const CLAW_API = "https://api.hyperclaw.app";
const API_KEY = () => process.env.HYPERCLI_CLAW_API_KEY || "";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const res = await fetch(`${CLAW_API}/api/agents/${id}`, {
      headers: { Authorization: `Bearer ${API_KEY()}` },
    });

    if (!res.ok) {
      throw new Error(`HyperClaw API ${res.status}: ${await res.text()}`);
    }

    return NextResponse.json(await res.json());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch agent";
    console.error(`[/api/agents/${id}]`, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const res = await fetch(`${CLAW_API}/api/agents/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${API_KEY()}` },
    });

    if (!res.ok) {
      throw new Error(`HyperClaw API ${res.status}: ${await res.text()}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete agent";
    console.error(`[/api/agents/${id} DELETE]`, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
