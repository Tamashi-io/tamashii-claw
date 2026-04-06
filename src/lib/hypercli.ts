import { HyperCLI } from "./hypercli-sdk/index.js";

/**
 * Server-side singleton HyperCLI client.
 * Uses env vars (no NEXT_PUBLIC_ prefix → never sent to browser).
 */
let _client: HyperCLI | null = null;

export function getClient(): HyperCLI {
  if (!_client) {
    _client = new HyperCLI({
      apiKey: process.env.HYPER_API_KEY || process.env.HYPERCLI_API_KEY || "",
      apiUrl: process.env.HYPERCLI_API_URL || "https://api.hypercli.com",
    });
  }
  return _client;
}
