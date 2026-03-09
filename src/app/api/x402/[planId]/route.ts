import { NextRequest } from "next/server";

const CLAW_API = "https://api.hyperclaw.app";
const API_KEY = () => process.env.HYPERCLI_CLAW_API_KEY || "";

/**
 * POST /api/x402/[planId]
 *
 * Transparent proxy to HyperClaw's x402 subscription endpoint.
 * Forwards the 402 Payment Required response (with PAYMENT-REQUIRED header)
 * so the client-side @x402/axios interceptor can sign the payment and retry.
 * On retry, forwards the PAYMENT-SIGNATURE / X-PAYMENT header to HyperClaw.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;

  // Collect headers to forward to HyperClaw
  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${API_KEY()}`,
    "Content-Type": "application/json",
  };

  // Forward x402 payment headers from client (retry with signed payment)
  const paymentSig = request.headers.get("payment-signature");
  const xPayment = request.headers.get("x-payment");
  if (paymentSig) forwardHeaders["PAYMENT-SIGNATURE"] = paymentSig;
  if (xPayment) forwardHeaders["X-PAYMENT"] = xPayment;

  const isRetry = !!(paymentSig || xPayment);
  console.log(`[x402 proxy] POST /api/x402/${planId} | retry=${isRetry} | has PAYMENT-SIGNATURE=${!!paymentSig} | has X-PAYMENT=${!!xPayment}`);

  let body: string | undefined;
  try {
    const text = await request.text();
    if (text) body = text;
  } catch {
    // empty body is fine
  }

  const upstream = await fetch(`${CLAW_API}/api/x402/${planId}`, {
    method: "POST",
    headers: forwardHeaders,
    body: body || "{}",
  });

  // Build response headers - forward all x402-related headers
  const responseHeaders = new Headers();
  const x402Headers = [
    "payment-required",
    "payment-response",
    "x-payment-response",
    "content-type",
  ];
  for (const h of x402Headers) {
    const val = upstream.headers.get(h);
    if (val) responseHeaders.set(h, val);
  }

  const hasPaymentRequired = !!upstream.headers.get("payment-required");
  console.log(`[x402 proxy] upstream ${upstream.status} | has PAYMENT-REQUIRED header=${hasPaymentRequired}`);

  // Log all upstream headers for debugging
  console.log(`[x402 proxy] upstream headers:`, Object.fromEntries(upstream.headers.entries()));

  // Expose x402 headers to the browser
  responseHeaders.set(
    "Access-Control-Expose-Headers",
    "PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE"
  );

  const responseBody = await upstream.text();
  console.log(`[x402 proxy] upstream body (first 200 chars):`, responseBody.slice(0, 200));

  return new Response(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
