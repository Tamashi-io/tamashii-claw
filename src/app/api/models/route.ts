import { NextResponse } from "next/server";
import { getClient } from "@/lib/hypercli";

export async function GET() {
  try {
    const client = getClient();
    const clawModels = await client.claw.models();

    // Translate SDK camelCase → frontend snake_case format
    const models = clawModels.map((m) => ({
      id: m.id,
      name: m.name,
      context_length: m.contextLength,
      max_completion_tokens: null,
      supports_vision: m.supportsVision,
      supports_tools: m.supportsFunctionCalling,
      supports_structured_outputs: false,
      supports_reasoning: false,
      input_modalities: m.supportsVision ? ["text", "image"] : ["text"],
    }));

    return NextResponse.json({ models });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch models";
    return NextResponse.json({ models: [], error: message }, { status: 502 });
  }
}
