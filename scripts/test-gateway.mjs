/**
 * OpenClaw Gateway Connection Test
 *
 * Usage:
 *   node scripts/test-gateway.mjs <url> <gateway-token> [hyperclaw-jwt]
 *
 * Examples:
 *   # Direct (local network only):
 *   node scripts/test-gateway.mjs ws://frerot1:18789 tamashiiclaw-gateway-auth
 *
 *   # Via HyperCLI routing proxy (needs JWT from GET /deployments/:id/token):
 *   node scripts/test-gateway.mjs wss://frerot1.hyperclaw.app tamashiiclaw-gateway-auth eyJ...
 *
 * Env vars (alternative to args):
 *   OPENCLAW_GATEWAY_TOKEN, HYPERCLAW_JWT
 */

import { createRequire } from "module";
import { createHash, randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDENTITY_FILE = resolve(__dirname, ".test-gateway-identity.json");

const require = createRequire(import.meta.url);
const WebSocket = require("ws");

// ── Config ────────────────────────────────────────────────────────────────────

const GW_URL   = process.argv[2] || "wss://frerot1.hyperclaw.app";
const GW_TOKEN = process.argv[3] || process.env.OPENCLAW_GATEWAY_TOKEN || "";
const HC_JWT   = process.argv[4] || process.env.HYPERCLAW_JWT || "";

if (!GW_TOKEN) {
  console.error("ERROR: provide OPENCLAW_GATEWAY_TOKEN as second arg or env var");
  process.exit(1);
}

if (GW_URL.startsWith("wss://") && !HC_JWT) {
  console.warn("[warn] wss:// URL without a HyperCLI JWT — connection will likely fail with 401");
  console.warn("[warn] Get one with: curl https://claw.tamashi.io/api/agents/<id>/token -H 'Authorization: Bearer <privy-token>'");
  console.warn("[warn] Then pass it as the third argument\n");
}

// ── Ed25519 helpers ───────────────────────────────────────────────────────────

const { getPublicKeyAsync, signAsync, utils: edUtils } =
  await import("@noble/ed25519");

function bytesToHex(b) {
  return Buffer.from(b).toString("hex");
}

function bytesToBase64url(b) {
  return Buffer.from(b).toString("base64url");
}

async function generateIdentity() {
  // Reuse persisted identity so the same device ID is used across runs
  if (existsSync(IDENTITY_FILE)) {
    try {
      const saved = JSON.parse(readFileSync(IDENTITY_FILE, "utf8"));
      if (saved.deviceId && saved.publicKey && saved.privateKey) {
        console.log(`[test-gateway] Loaded persisted device identity: ${saved.deviceId.slice(0, 12)}...`);
        return {
          deviceId: saved.deviceId,
          publicKey: saved.publicKey,
          privateKeyBytes: Buffer.from(saved.privateKey, "base64url"),
        };
      }
    } catch {}
  }
  const privBytes = edUtils.randomSecretKey();
  const pubBytes = await getPublicKeyAsync(privBytes);
  const deviceId = createHash("sha256").update(pubBytes).digest("hex");
  const identity = {
    deviceId,
    publicKey: bytesToBase64url(pubBytes),
    privateKey: bytesToBase64url(privBytes),
  };
  writeFileSync(IDENTITY_FILE, JSON.stringify(identity, null, 2));
  console.log(`[test-gateway] Generated new device identity: ${deviceId.slice(0, 12)}... (saved to ${IDENTITY_FILE})`);
  return { ...identity, privateKeyBytes: privBytes };
}

async function signPayload(privateKeyBytes, payload) {
  const sig = await signAsync(Buffer.from(payload, "utf8"), privateKeyBytes);
  return bytesToBase64url(sig);
}

// ── Test ──────────────────────────────────────────────────────────────────────

console.log(`\n[test-gateway] Connecting to ${GW_URL}`);
console.log(`[test-gateway] Token: ${GW_TOKEN.slice(0, 8)}...${GW_TOKEN.slice(-4)}\n`);

const identity = await generateIdentity();
console.log(`[test-gateway] Device ID: ${identity.deviceId.slice(0, 12)}...`);

const wsOptions = { handshakeTimeout: 15_000 };
if (HC_JWT) {
  wsOptions.headers = { Authorization: `Bearer ${HC_JWT}` };
  console.log(`[test-gateway] Using HyperCLI JWT: ${HC_JWT.slice(0, 12)}...`);
}

const ws = new WebSocket(GW_URL, wsOptions);

let done = false;
let retrying = false;
let connectAttempt = 0;
let pendingReqId = null;

const fail = (msg) => {
  if (done) return;
  done = true;
  console.error(`\n[FAIL] ${msg}`);
  ws.terminate();
  process.exit(1);
};

const succeed = (msg) => {
  if (done) return;
  done = true;
  console.log(`\n[PASS] ${msg}`);
  ws.close(1000);
  process.exit(0);
};

const timeout = setTimeout(() => fail("Timed out waiting for gateway response"), 30_000);

ws.on("error", (err) => {
  clearTimeout(timeout);
  fail(`WebSocket error: ${err.message}`);
});

ws.on("close", (code, reason) => {
  clearTimeout(timeout);
  if (!done && !retrying) fail(`Connection closed unexpectedly: ${code} ${reason}`);
});

ws.on("open", () => {
  console.log("[test-gateway] WebSocket opened");
});

function buildConnectParams(nonce, signedAtMs, signature, authToken) {
  const params = {
    minProtocol: 3,
    maxProtocol: 3,
    client: { id: "cli", version: "test-gateway/1.0", platform: "node", mode: "cli" },
    role: "operator",
    scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
    device: {
      id: identity.deviceId,
      publicKey: identity.publicKey,
      signature,
      signedAt: signedAtMs,
      nonce,
    },
  };
  if (authToken) params.auth = { token: authToken };
  return params;
}

function sendConnect2(socket, nonce, signedAtMs, signature) {
  const reqId = randomBytes(8).toString("hex");
  const params = buildConnectParams(nonce, signedAtMs, signature, null);
  console.log(`[test-gateway] → sending connect (device-only, no auth.token)`);
  socket.send(JSON.stringify({ type: "req", id: reqId, method: "connect", params }));
}

function sendConnect(nonce, signedAtMs, signature, authToken) {
  const reqId = randomBytes(8).toString("hex");
  pendingReqId = reqId;
  const params = buildConnectParams(nonce, signedAtMs, signature, authToken);
  const label = authToken ? `with auth.token` : `without auth.token (device-only)`;
  console.log(`[test-gateway] → sending connect (attempt ${connectAttempt + 1}, ${label})`);
  ws.send(JSON.stringify({ type: "req", id: reqId, method: "connect", params }));
  connectAttempt++;
}

ws.on("message", async (data) => {
  let msg;
  try {
    msg = JSON.parse(data.toString());
  } catch {
    console.warn("[test-gateway] Non-JSON message:", data.toString().slice(0, 200));
    return;
  }

  console.log("[test-gateway] ←", JSON.stringify(msg).slice(0, 300));

  // Step 1: challenge
  if (msg.type === "event" && msg.event === "connect.challenge") {
    const nonce = msg.payload?.nonce;
    if (!nonce) return fail("Challenge missing nonce");

    console.log(`[test-gateway] Got challenge nonce: ${nonce}`);

    const signedAtMs = Date.now();
    const payloadStr = [
      "v2",
      identity.deviceId,
      "cli",          // clientId
      "cli",          // clientMode
      "operator",
      "operator.admin,operator.approvals,operator.pairing",
      String(signedAtMs),
      GW_TOKEN,
      nonce,
    ].join("|");

    const signature = await signPayload(identity.privateKeyBytes, payloadStr);

    sendConnect(nonce, signedAtMs, signature, connectAttempt === 0 ? GW_TOKEN : null);
    return;
  }

  // Step 2: connect response
  if (msg.type === "res" && msg.ok === true && (msg.payload?.type === "hello-ok" || msg.payload?.server?.version !== undefined)) {
    clearTimeout(timeout);
    const v = msg.payload.server?.version ?? msg.payload.version ?? "?";
    const proto = msg.payload.protocol ?? "?";
    succeed(`Handshake complete! version=${v} protocol=${proto}`);
    return;
  }

  // Error response
  if (msg.type === "res" && msg.ok === false) {
    const errCode = msg.error?.details?.code ?? msg.error?.code;
    const canRetry = msg.error?.details?.canRetryWithDeviceToken;

    // AUTH_TOKEN_MISMATCH + canRetryWithDeviceToken → retry without auth.token
    if (errCode === "AUTH_TOKEN_MISMATCH" && canRetry && connectAttempt === 1) {
      console.log("[test-gateway] Token mismatch — retrying without auth.token (device-only mode)");
      // Re-request challenge by sending a dummy message that triggers re-challenge,
      // or just resend connect without auth — gateway should handle it
      const signedAtMs2 = Date.now();
      const nonce2 = msg.error?.details?.nonce ?? randomBytes(8).toString("hex");
      // We need a fresh nonce from a new challenge — close and reconnect
      console.log("[test-gateway] Reconnecting for fresh challenge...");
      retrying = true;
      ws.removeAllListeners("message");
      ws.close();

      // Reconnect
      const ws2 = new WebSocket(GW_URL, wsOptions);
      const timeout2 = setTimeout(() => fail("Timed out on retry"), 30_000);

      ws2.on("error", (err) => { clearTimeout(timeout2); fail(`Retry WebSocket error: ${err.message}`); });
      ws2.on("close", (code, reason) => { clearTimeout(timeout2); if (!done) fail(`Retry closed: ${code} ${reason}`); });
      ws2.on("open", () => console.log("[test-gateway] Retry WebSocket opened"));

      ws2.on("message", async (data2) => {
        let m2;
        try { m2 = JSON.parse(data2.toString()); } catch { return; }
        console.log("[test-gateway] ←", JSON.stringify(m2).slice(0, 300));

        if (m2.type === "event" && m2.event === "connect.challenge") {
          const nonce3 = m2.payload?.nonce;
          const signedAtMs3 = Date.now();
          const payloadStr3 = [
            "v2", identity.deviceId, "cli", "cli", "operator",
            "operator.admin,operator.approvals,operator.pairing",
            String(signedAtMs3), "", nonce3,
          ].join("|");
          const sig3 = await signPayload(identity.privateKeyBytes, payloadStr3);
          sendConnect2(ws2, nonce3, signedAtMs3, sig3);
        }

        if (m2.type === "res" && m2.ok === true) {
          clearTimeout(timeout2);
          const v = m2.payload?.version ?? "?";
          succeed(`Handshake complete (device-only)! version=${v} protocol=${m2.payload?.protocol ?? "?"}`);
        }

        if (m2.type === "res" && m2.ok === false) {
          clearTimeout(timeout2);
          const ec = m2.error?.details?.code ?? m2.error?.code;
          if (ec === "PAIRING_REQUIRED") {
            const reqId = m2.error?.details?.requestId ?? m2.error?.details?.pairingRequestId;
            console.log("[test-gateway] Full error:", JSON.stringify(m2.error, null, 2));
            fail(`PAIRING_REQUIRED — approve with:\n  openclaw devices approve ${reqId ?? "<requestId from above>"}`);
          } else {
            console.log("[test-gateway] Full error:", JSON.stringify(m2.error, null, 2));
            fail(`Retry rejected: ${ec} — ${m2.error?.message}`);
          }
        }
      });
      return;
    }

    clearTimeout(timeout);
    console.log("[test-gateway] Full error details:", JSON.stringify(msg.error, null, 2));
    if (errCode === "PAIRING_REQUIRED") {
      const reqId = msg.error?.details?.requestId ?? msg.error?.details?.pairingRequestId;
      fail(`PAIRING_REQUIRED — approve with:\n  openclaw devices approve ${reqId ?? "<see details above>"}`);
    } else {
      fail(`Gateway rejected connect: ${errCode} — ${msg.error?.message}`);
    }
    return;
  }
});
