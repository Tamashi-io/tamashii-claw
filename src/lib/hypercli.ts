import { HyperCLI } from "@hypercli/sdk";

/**
 * Server-side singleton HyperCLI client.
 * Uses env vars (no NEXT_PUBLIC_ prefix → never sent to browser).
 */
let _client: HyperCLI | null = null;

export function getClient(): HyperCLI {
  if (!_client) {
    _client = new HyperCLI({
      apiKey: process.env.HYPERCLI_API_KEY || "",
      apiUrl: process.env.HYPERCLI_API_URL || "https://api.hypercli.com",
      clawApiKey: process.env.HYPERCLI_CLAW_API_KEY || "",
    });
  }
  return _client;
}
