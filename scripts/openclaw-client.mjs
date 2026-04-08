/**
 * OpenClaw Gateway Client — Node.js
 *
 * Minimal production-ready client for third-party apps.
 *
 * Usage:
 *   import { OpenClawClient } from "./openclaw-client.mjs";
 *
 *   const client = new OpenClawClient({
 *     url: "wss://frerot1.hyperclaw.app",
 *     gatewayToken: "tamashiiclaw-gateway-auth",
 *     identityFile: ".openclaw-identity.json",   // persists device keypair
 *   });
 *
 *   await client.connect();
 *   // On first run → PAIRING_REQUIRED, prints requestId to approve
 *   // On subsequent runs → connected immediately
 *
 *   const history = await client.call("chat.history", { sessionKey: "main" });
 *   await client.call("chat.send", { message: "Hello!", sessionKey: "main" });
 *
 *   client.onEvent((event, payload) => {
 *     if (event === "chat") console.log(payload.text);
 *   });
 *
 *   client.close();
 */

import { createRequire } from "module";
import { createHash, randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";

const require = createRequire(import.meta.url);
const WebSocket = require("ws");

const { getPublicKeyAsync, signAsync, utils: edUtils } =
  await import("@noble/ed25519");

// ── Identity ──────────────────────────────────────────────────────────────────

async function loadOrCreateIdentity(identityFile) {
  if (identityFile && existsSync(identityFile)) {
    try {
      const s = JSON.parse(readFileSync(identityFile, "utf8"));
      if (s.deviceId && s.publicKey && s.privateKey) {
        return {
          deviceId: s.deviceId,
          publicKey: s.publicKey,
          privateKeyBytes: Buffer.from(s.privateKey, "base64url"),
        };
      }
    } catch {}
  }
  const privBytes = edUtils.randomSecretKey();
  const pubBytes = await getPublicKeyAsync(privBytes);
  const deviceId = createHash("sha256").update(pubBytes).digest("hex");
  const identity = {
    deviceId,
    publicKey: Buffer.from(pubBytes).toString("base64url"),
    privateKey: Buffer.from(privBytes).toString("base64url"),
  };
  if (identityFile) writeFileSync(identityFile, JSON.stringify(identity, null, 2));
  return { ...identity, privateKeyBytes: privBytes };
}

async function signDevicePayload(identity, { nonce, gatewayToken }) {
  const signedAtMs = Date.now();
  const payload = [
    "v2",
    identity.deviceId,
    "cli",
    "cli",
    "operator",
    "operator.admin,operator.approvals,operator.pairing",
    String(signedAtMs),
    gatewayToken,
    nonce,
  ].join("|");
  const sig = await signAsync(Buffer.from(payload, "utf8"), identity.privateKeyBytes);
  return { signature: Buffer.from(sig).toString("base64url"), signedAtMs };
}

// ── Client ────────────────────────────────────────────────────────────────────

export class OpenClawClient {
  #url;
  #gatewayToken;
  #identityFile;
  #identity = null;
  #ws = null;
  #pending = new Map();   // reqId → { resolve, reject }
  #eventHandlers = [];
  #connected = false;

  constructor({ url, gatewayToken, identityFile = null }) {
    this.#url = url;
    this.#gatewayToken = gatewayToken;
    this.#identityFile = identityFile;
  }

  onEvent(handler) {
    this.#eventHandlers.push(handler);
  }

  // ── Connect ───────────────────────────────────────────────────────────────

  connect(timeoutMs = 60_000) {
    return new Promise(async (resolve, reject) => {
      this.#identity = await loadOrCreateIdentity(this.#identityFile);

      const ws = new WebSocket(this.#url, { handshakeTimeout: 15_000 });
      this.#ws = ws;

      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error("Connection timed out"));
      }, timeoutMs);

      ws.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });

      ws.on("close", (code, reason) => {
        this.#connected = false;
        if (!this.#connected) {
          clearTimeout(timer);
          reject(new Error(`Gateway closed (${code}): ${reason}`));
        }
      });

      ws.on("message", async (data) => {
        let msg;
        try { msg = JSON.parse(data.toString()); } catch { return; }

        // ── Handshake ──
        if (msg.type === "event" && msg.event === "connect.challenge") {
          const nonce = msg.payload?.nonce;
          const { signature, signedAtMs } = await signDevicePayload(
            this.#identity,
            { nonce, gatewayToken: this.#gatewayToken }
          );
          const reqId = randomBytes(8).toString("hex");
          ws.send(JSON.stringify({
            type: "req",
            id: reqId,
            method: "connect",
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { id: "cli", version: "openclaw-client/1.0", platform: "node", mode: "cli" },
              role: "operator",
              scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
              device: {
                id: this.#identity.deviceId,
                publicKey: this.#identity.publicKey,
                signature,
                signedAt: signedAtMs,
                nonce,
              },
              auth: { token: this.#gatewayToken },
            },
          }));
          return;
        }

        if (msg.type === "res") {
          // ── Connect response ──
          if (msg.payload?.type === "hello-ok") {
            clearTimeout(timer);
            this.#connected = true;
            ws.removeAllListeners("close");
            ws.on("close", () => { this.#connected = false; });
            resolve(msg.payload.server?.version);
            return;
          }

          // ── PAIRING_REQUIRED ──
          if (msg.ok === false) {
            const code = msg.error?.details?.code ?? msg.error?.code;
            if (code === "PAIRING_REQUIRED") {
              const requestId = msg.error?.details?.requestId;
              clearTimeout(timer);
              ws.terminate();
              const err = new Error(`PAIRING_REQUIRED`);
              err.requestId = requestId;
              err.deviceId = this.#identity.deviceId;
              err.approveCommand = `OPENCLAW_GATEWAY_TOKEN=${this.#gatewayToken} openclaw devices approve ${requestId}`;
              reject(err);
              return;
            }
            clearTimeout(timer);
            ws.terminate();
            reject(new Error(`${code ?? msg.error?.code}: ${msg.error?.message}`));
            return;
          }

          // ── RPC response ──
          const pending = this.#pending.get(msg.id);
          if (pending) {
            this.#pending.delete(msg.id);
            if (msg.ok) pending.resolve(msg.payload);
            else pending.reject(new Error(`${msg.error?.code}: ${msg.error?.message}`));
          }
          return;
        }

        // ── Events ──
        if (msg.type === "event") {
          for (const h of this.#eventHandlers) h(msg.event, msg.payload ?? {});
        }
      });
    });
  }

  // ── RPC ───────────────────────────────────────────────────────────────────

  call(method, params = {}, timeoutMs = 30_000) {
    if (!this.#connected) throw new Error("Not connected");
    return new Promise((resolve, reject) => {
      const id = randomBytes(8).toString("hex");
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, timeoutMs);
      this.#pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject:  (e) => { clearTimeout(timer); reject(e); },
      });
      this.#ws.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }

  close() {
    this.#ws?.close(1000);
  }
}

// ── Example ───────────────────────────────────────────────────────────────────

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const GW_URL   = process.argv[2] || "wss://frerot1.hyperclaw.app";
  const GW_TOKEN = process.argv[3] || process.env.OPENCLAW_GATEWAY_TOKEN || "tamashiiclaw-gateway-auth";

  const client = new OpenClawClient({
    url: GW_URL,
    gatewayToken: GW_TOKEN,
    identityFile: new URL(".openclaw-identity.json", import.meta.url).pathname,
  });

  try {
    const version = await client.connect();
    console.log(`Connected! Server version: ${version}`);

    client.onEvent((event, payload) => {
      if (event === "chat") process.stdout.write(payload.text ?? "");
      if (event === "tick") {}  // heartbeat, ignore
    });

    // Send a test message
    const msg = process.argv[4] || "Say hello in one sentence.";
    console.log(`\nSending: "${msg}"\n`);
    await client.call("chat.send", { message: msg, sessionKey: "main" });

    // Wait for response to finish
    await new Promise((resolve) => {
      client.onEvent((event, payload) => {
        if (event === "chat" && payload.state === "final") resolve();
      });
      setTimeout(resolve, 30_000);
    });

    console.log("\n\nDone.");
    client.close();
    process.exit(0);
  } catch (err) {
    if (err.requestId) {
      console.error(`\nPairing required. Run on the agent:\n  ${err.approveCommand}`);
    } else {
      console.error(`\nFailed: ${err.message}`);
    }
    process.exit(1);
  }
}
