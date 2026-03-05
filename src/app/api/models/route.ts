import { NextResponse } from "next/server";

const CLAW_API = "https://api.hyperclaw.app/v1";
const API_KEY = () => process.env.HYPERCLI_CLAW_API_KEY || "";

export async function GET() {
  try {
    const res = await fetch(`${CLAW_API}/models`, {
      headers: { Authorization: `Bearer ${API_KEY()}` },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`HyperClaw API ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();

    // Translate OpenAI /v1/models format → frontend ModelInfo format
    const models = (data.data || []).map((m: Record<string, unknown>) => ({
      id: m.id,
      name: m.id,
      context_length: null,
      max_completion_tokens: null,
      supports_vision: false,
      supports_tools: false,
      supports_structured_outputs: false,
      supports_reasoning: false,
      input_modalities: ["text"],
    }));

    return NextResponse.json({ models });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch models";
    console.error("[/api/models]", message);
    return NextResponse.json({ models: [], error: message }, { status: 502 });
  }
}
