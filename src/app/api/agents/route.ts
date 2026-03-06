import { NextResponse } from "next/server";

const CLAW_API = "https://api.hyperclaw.app";
const API_KEY = () => process.env.HYPERCLI_CLAW_API_KEY || "";

export async function GET() {
  try {
    const res = await fetch(`${CLAW_API}/api/agents`, {
      headers: { Authorization: `Bearer ${API_KEY()}` },
    });

    if (!res.ok) {
      throw new Error(`HyperClaw API ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch agents";
    console.error("[/api/agents]", message);
    return NextResponse.json({ items: [], error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(`${CLAW_API}/api/agents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.name,
        cpu_millicores: body.cpu_millicores || 500,
        memory_mib: body.memory_mib || 512,
        start: body.start ?? true,
        config: body.config || {},
      }),
    });

    if (!res.ok) {
      throw new Error(`HyperClaw API ${res.status}: ${await res.text()}`);
    }

    return NextResponse.json(await res.json(), { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create agent";
    console.error("[/api/agents POST]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
