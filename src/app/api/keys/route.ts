import { NextResponse } from "next/server";
import { getClient } from "@/lib/hypercli";

export async function GET() {
  try {
    const client = getClient();
    const status = await client.claw.keyStatus();
    return NextResponse.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch key status";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
