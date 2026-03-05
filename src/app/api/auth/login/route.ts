import { NextResponse } from "next/server";

const CLAW_API = "https://api.hyperclaw.app";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(`${CLAW_API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privy_token: body.privy_token }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Auth failed: ${res.status} - ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Auth failed";
    console.error("[/api/auth/login]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
