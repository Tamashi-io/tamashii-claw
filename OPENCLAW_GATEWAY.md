# OpenClaw Gateway — Next.js Integration Guide

A complete reference for connecting a Next.js app to the OpenClaw gateway WebSocket.

---

## Overview

OpenClaw is an AI agent runtime that exposes a JSON-RPC WebSocket gateway on port 18789 of each agent pod at `wss://{agentName}.hyperclaw.app`. The gateway handles chat, config, file management, sessions, and cron jobs.

**Browser constraint:** Browsers cannot set `Authorization` headers on WebSocket connections. HyperCLI's routing proxy requires `Authorization: Bearer {jwt}` to reach the agent pod. The solution is a **server-side WebSocket proxy** — your Next.js backend opens the upstream connection with the proper header, and the browser connects to your backend.

---

## Architecture

```
Browser (React)
    │  wss://yourapp.com/ws/gateway?token={privyToken}
    ▼
Next.js API Route (Node.js)        ← validates Privy token, fetches HyperCLI JWT
    │  wss://agentName.hyperclaw.app
    │  Authorization: Bearer {hyperclawJwt}
    ▼
HyperCLI Routing Proxy
    │  port 18789
    ▼
OpenClaw Gateway Process
```

---

## Authentication

Two tokens are involved:

| Token | Purpose | How to get it |
|---|---|---|
| **Privy token** | Identifies the user to your backend | `await privyClient.getAccessToken()` on the client |
| **HyperCLI JWT** | Authenticates to HyperCLI's routing proxy | `GET /api/agents/:id/token` on your backend → `{ token, expires_at }` |

**HyperCLI JWT endpoint** (your backend calls this against HyperCLI):
```
GET https://api.hyperclaw.app/v1/deployments/:agentId/token
Authorization: Bearer {hyperclawApiKey}
→ { token: "eyJ...", expires_at: "2026-..." }
```

---

## 1. Server-Side WebSocket Proxy (Next.js API Route)

Create `app/api/ws/gateway/route.ts` (or `pages/api/ws/gateway.ts`).

Next.js does not support WebSocket upgrades natively in App Router. Use a **custom server** (`server.ts`) or a **standalone Node.js WS handler**.

### Custom Server (`server.ts`)

```typescript
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

const app = next({ dev: process.env.NODE_ENV !== "production" });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url!, true));
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    const { pathname, query } = parse(req.url ?? "", true);

    // Only handle gateway upgrade requests
    // Pattern: /ws/agents/:agentId/gateway?token=<privyToken>
    const match = pathname?.match(/^\/ws\/agents\/([^/]+)\/gateway$/);
    if (!match) {
      socket.destroy();
      return;
    }

    const agentId = match[1];
    const privyToken = query.token as string;

    if (!privyToken) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (client) => {
      handleGatewayProxy(client, agentId, privyToken);
    });
  });

  server.listen(3000);
});
```

### Proxy Handler

```typescript
import { WebSocket } from "ws";

const HYPERCLAW_API = "https://api.hyperclaw.app/v1";
const HYPERCLAW_API_KEY = process.env.HYPERCLAW_API_KEY!;

async function getHyperclawJwt(agentId: string): Promise<string> {
  const res = await fetch(`${HYPERCLAW_API}/deployments/${agentId}/token`, {
    headers: { Authorization: `Bearer ${HYPERCLAW_API_KEY}` },
  });
  if (!res.ok) throw new Error(`HyperCLI token fetch failed: ${res.status}`);
  const data = await res.json();
  return data.token as string;
}

async function validatePrivyToken(token: string): Promise<boolean> {
  // Use your Privy server SDK
  // import { PrivyClient } from "@privy-io/server-auth";
  // const privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);
  // const claims = await privy.verifyAuthToken(token);
  // return !!claims.userId;
  return true; // replace with real validation
}

async function handleGatewayProxy(
  client: WebSocket,
  agentId: string,
  privyToken: string
) {
  const OPEN = WebSocket.OPEN;

  // 1. Validate user
  const valid = await validatePrivyToken(privyToken).catch(() => false);
  if (!valid) {
    client.close(1008, "Unauthorized");
    return;
  }

  // 2. Get HyperCLI JWT
  let jwt: string;
  try {
    jwt = await getHyperclawJwt(agentId);
  } catch (err) {
    client.close(1011, "Token fetch failed");
    return;
  }

  // 3. Get agent hostname
  const agentRes = await fetch(`${HYPERCLAW_API}/deployments/${agentId}`, {
    headers: { Authorization: `Bearer ${HYPERCLAW_API_KEY}` },
  });
  const agent = await agentRes.json();
  const upstreamUrl = agent.openclaw_url?.startsWith("wss://")
    ? agent.openclaw_url
    : `wss://${agent.hostname}`;

  // 4. Open upstream with Authorization header (only possible server-side)
  const upstream = new WebSocket(upstreamUrl, {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  // 5. Pipe client ↔ upstream
  upstream.on("open", () => {
    client.on("message", (data) => {
      if (upstream.readyState === OPEN) upstream.send(data);
    });
    client.on("close", () => upstream.close());
  });

  upstream.on("message", (data) => {
    if (client.readyState === OPEN) client.send(data);
  });

  upstream.on("close", (code, reason) => {
    if (client.readyState === OPEN) client.close(code, reason);
  });

  upstream.on("error", (err) => {
    if (client.readyState === OPEN) client.close(1011, err.message.slice(0, 100));
  });

  (upstream as any).on("unexpected-response", (_req: any, res: any) => {
    if (client.readyState === OPEN) client.close(1011, `HTTP ${res.statusCode}`);
  });

  client.on("error", () => upstream.close());
}
```

---

## 2. OpenClaw Gateway Protocol

All messages are JSON strings.

### Message Types

```typescript
// Request (client → server)
{ type: "req", id: string, method: string, params?: object }

// Response (server → client)
{ type: "res", id: string, ok: boolean, payload?: any, error?: { code, message, details } }

// Event (server → client, unsolicited)
{ type: "event", event: string, payload: object }
```

---

## 3. Connection Handshake (Protocol v3)

The handshake is a 3-step exchange after the WebSocket opens:

```
Server → Client:  { event: "connect.challenge", payload: { nonce: "abc123" } }
Client → Server:  { type: "req", id: "...", method: "connect", params: { ... } }
Server → Client:  { type: "res", id: "...", ok: true, payload: { version, protocol, auth? } }
```

### Connect Params

```typescript
{
  minProtocol: 3,
  maxProtocol: 3,
  client: {
    id: "cli",           // client identifier
    version: "myapp/1.0",
    platform: "browser", // or "node"
    mode: "cli",
  },
  role: "operator",
  scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
  device: {
    id: deviceId,         // SHA-256 hex of public key
    publicKey: pubKeyB64, // base64url Ed25519 public key
    signature: sigB64,    // base64url Ed25519 signature of payload string
    signedAt: Date.now(),
    nonce: nonce,         // from challenge
  },
  auth: { token: "tamashiiclaw-gateway-auth" }, // OPENCLAW_GATEWAY_TOKEN value
}
```

### Device Identity Payload (what you sign)

```typescript
const payload = [
  "v2",
  deviceId,
  clientId,      // "cli"
  clientMode,    // "cli"
  "operator",
  "operator.admin,operator.approvals,operator.pairing",
  String(signedAtMs),
  gatewayToken,  // OPENCLAW_GATEWAY_TOKEN
  nonce,
].join("|");
// Sign with Ed25519 private key, encode as base64url
```

### Device Identity — Electron / Node.js Implementation

In Node.js you can use `@noble/ed25519`:

```typescript
import { getPublicKeyAsync, signAsync, utils } from "@noble/ed25519";
import * as crypto from "crypto";

// Store this persistently (e.g. electron-store or fs)
interface DeviceIdentity {
  deviceId: string;   // SHA-256 hex of public key
  publicKey: string;  // base64url
  privateKey: string; // base64url
}

function base64urlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function base64urlDecode(s: string): Uint8Array {
  return Buffer.from(s, "base64url");
}

async function loadOrCreateIdentity(store: any): Promise<DeviceIdentity> {
  const existing = store.get("deviceIdentity");
  if (existing?.deviceId && existing?.publicKey && existing?.privateKey) {
    return existing;
  }
  const privBytes = utils.randomSecretKey();
  const pubBytes = await getPublicKeyAsync(privBytes);
  const deviceId = crypto.createHash("sha256").update(pubBytes).digest("hex");
  const identity = {
    deviceId,
    publicKey: base64urlEncode(pubBytes),
    privateKey: base64urlEncode(privBytes),
  };
  store.set("deviceIdentity", identity);
  return identity;
}

async function signPayload(privateKey: string, payload: string): Promise<string> {
  const sig = await signAsync(
    new TextEncoder().encode(payload),
    base64urlDecode(privateKey)
  );
  return base64urlEncode(sig);
}
```

---

## 4. Gateway Client (React / Browser)

Copy or adapt `src/gateway-client.ts` from this repo — it implements the full handshake and RPC layer.

### Basic usage

```typescript
import { GatewayClient } from "@/gateway-client";

const gw = new GatewayClient({
  url: "wss://yourapp.com/ws/agents/{agentId}/gateway",
  token: await privyClient.getAccessToken(),   // sent as ?token= query param
  gatewayToken: "tamashiiclaw-gateway-auth",   // OPENCLAW_GATEWAY_TOKEN
  clientId: "cli",
  clientMode: "cli",
});

await gw.connect();

// Listen for streaming chat events
gw.onEvent((event, payload) => {
  if (event === "chat") {
    console.log(payload.text); // partial streaming text
    if (payload.state === "final") setSending(false);
  }
});

// Send a message
await gw.chatSend("Hello agent!", "main");

// Close
gw.close();
```

---

## 5. Available RPC Methods

### Chat

```typescript
// Send a message (streams events back via onEvent("chat"))
gw.chatSend(message: string, sessionKey?: string, agentId?: string)

// Get history
gw.chatHistory(sessionKey?: string, limit?: number)  // → Message[]

// Abort current generation
gw.chatAbort(sessionKey?: string)
```

### Config

```typescript
gw.configGet()                      // → Record<string, unknown>
gw.configSchema()                   // → JSON Schema object
gw.configPatch(patch: object)       // deep-merges patch; gateway restarts to apply
```

### Agents / Files

```typescript
gw.agentsList()                                   // → Agent[]
gw.filesList(agentId: string)                     // → { name, size }[]
gw.fileGet(agentId: string, name: string)         // → string (content)
gw.fileSet(agentId: string, name: string, content: string)
```

### Sessions

```typescript
gw.sessionsList(limit?: number)   // → Session[]
gw.sessionsPatch(patch: { key: string, [k: string]: unknown })
```

### Models

```typescript
gw.modelsList()   // → Model[]
```

### Cron

```typescript
gw.cronList()                     // → CronJob[]
gw.cronAdd(job: object)
gw.cronRemove(jobId: string)
gw.cronRun(jobId: string)
```

### Exec Approvals

```typescript
gw.execApprove(execId: string)
gw.execDeny(execId: string)
```

---

## 6. Chat Streaming Events

After calling `chatSend`, the server pushes `chat` events until `state === "final"`:

```typescript
gw.onEvent((event, payload) => {
  if (event !== "chat") return;

  const { state, text, error, errorMessage } = payload as any;

  if (state === "streaming") {
    // Append text to current message
    setCurrentMessage((prev) => text ?? prev);
  }

  if (state === "final") {
    setSending(false);
  }

  if (state === "error") {
    setSending(false);
    setError(errorMessage ?? error ?? "Agent error");
  }
});
```

**Event `state` values:**

| state | meaning |
|---|---|
| `streaming` | partial text chunk |
| `final` | generation complete |
| `error` | generation failed |
| `tool_call` | agent is using a tool |
| `tool_result` | tool returned a result |
| `thinking` | extended thinking content |

---

## 7. Error Codes

| Code | Meaning |
|---|---|
| `PAIRING_REQUIRED` | Device not yet approved — run `openclaw devices approve {requestId}` on the agent |
| `AUTH_DEVICE_TOKEN_MISMATCH` | Cached device token is stale — clear and reconnect |
| `SCOPE_LIMITED` | Connected with reduced scopes (read-only) |

On `PAIRING_REQUIRED`, `gw.pairingRequestId` holds the request ID to approve.

---

## 8. Retry Logic

OpenClaw takes 60–90 s to start. Implement retries with backoff:

```typescript
const DELAYS = [0, 15_000, 15_000, 20_000, 30_000];

for (let i = 0; i <= DELAYS.length; i++) {
  if (i > 0) await sleep(DELAYS[i - 1]);
  try {
    await gw.connect();
    break;
  } catch (err) {
    if (i === DELAYS.length) throw err;
    console.log(`Retry ${i}/${DELAYS.length}:`, err.message);
  }
}
```

**Important:** If the WebSocket closes during the handshake (e.g. upstream 503), the `connect()` promise must reject immediately — not wait for the 60 s timeout. The `gateway-client.ts` in this repo already handles this via the `onclose` guard in `handshakePhase`.

---

## 9. Environment Variables

```env
# Your backend
HYPERCLAW_API_KEY=hck_...          # HyperCLI service account key
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...

# Set on each agent pod at creation time
OPENCLAW_GATEWAY_TOKEN=your-secret-token
OPENCLAW_GATEWAY_MODE=local
OPENCLAW_CONTROL_UI_ALLOWED_ORIGIN=https://yourapp.com
```

`OPENCLAW_GATEWAY_TOKEN` must match the `auth.token` you send in the `connect` params.

---

## 10. Third-Party App Integration — Findings

Verified findings from live testing against a HyperCLI-hosted agent (`frerot1.hyperclaw.app`).

### 10.1 JWT not required for `auth: false` routes

If the agent route is configured with `auth: false` (the default for the `openclaw` route on port 18789), HyperCLI's routing proxy forwards WebSocket connections **without requiring an `Authorization` header**. A third-party app can connect directly to `wss://{agentName}.hyperclaw.app` with no JWT — authentication is handled entirely by the gateway handshake token.

```typescript
// No Authorization header needed when route has auth: false
const ws = new WebSocket("wss://frerot1.hyperclaw.app");
```

This simplifies third-party integration: no HyperCLI API key required on the client side.

### 10.2 Gateway token precedence

The running gateway's `auth.token` is determined at startup by this precedence (highest first):

1. `gateway.auth.token` in `openclaw.json` config file
2. `OPENCLAW_GATEWAY_TOKEN` environment variable

If `openclaw.json` explicitly sets `gateway.auth.token`, **the env var is ignored** by the gateway process. However, the `openclaw` CLI client uses `OPENCLAW_GATEWAY_TOKEN` as its remote token unless `gateway.remote.token` is also set in the config.

**To keep everything in sync**, either:
- Do not set `gateway.auth.token` in `openclaw.json` (let it fall through to the env var), or
- Set both `gateway.auth.token` **and** `gateway.remote.token` to the same value in `openclaw.json`

```json
"gateway": {
  "auth": { "token": "your-secret-token" },
  "remote": { "token": "your-secret-token" }
}
```

### 10.3 `hello-ok` response shape

The successful `connect` response has this structure (not `payload.version` — that field is absent):

```json
{
  "type": "res",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 3,
    "server": {
      "version": "2026.3.23",
      "connId": "..."
    },
    "features": { "methods": [...] }
  }
}
```

Check `payload.type === "hello-ok"` or `payload.server.version` to detect a successful handshake.

### 10.4 Device identity must be persisted

The Ed25519 keypair used for the `connect` handshake must be saved to disk and reused across connections. If a new keypair is generated each time, the device will always be in `PAIRING_REQUIRED` state and require a new `openclaw devices approve` call on every reconnect.

```typescript
// Save on first generation, load on subsequent runs
const IDENTITY_FILE = ".openclaw-device-identity.json";

async function loadOrCreateIdentity() {
  if (existsSync(IDENTITY_FILE)) {
    const saved = JSON.parse(readFileSync(IDENTITY_FILE, "utf8"));
    return { ...saved, privateKeyBytes: Buffer.from(saved.privateKey, "base64url") };
  }
  // generate, save, return
}
```

### 10.5 `AUTH_TOKEN_MISMATCH` error flow

When the gateway token is wrong, the gateway responds with:

```json
{
  "code": "INVALID_REQUEST",
  "details": {
    "code": "AUTH_TOKEN_MISMATCH",
    "canRetryWithDeviceToken": true | false,
    "recommendedNextStep": "retry_with_device_token" | "update_auth_configuration"
  }
}
```

- `canRetryWithDeviceToken: true` → retry connecting **without** `auth.token` in the connect params. The gateway will still reject if it requires a token (`AUTH_TOKEN_MISSING`), so this path only works if the gateway is configured to allow token-less device connections.
- `canRetryWithDeviceToken: false` → the gateway requires a matching token; there is no fallback. The connection must be closed and re-attempted with the correct token.

The gateway closes the WebSocket with code `1008` after sending the error, so any retry requires a fresh WebSocket connection.

### 10.6 Approving devices on HyperCLI-hosted agents

Since there is no local shell access, device pairing must be approved via the HyperCLI exec API:

```bash
# Via backend exec endpoint
curl -X POST https://your-backend/api/agents/{agentId}/exec \
  -H "Authorization: Bearer {privyToken}" \
  -H "Content-Type: application/json" \
  -d '{"command": "OPENCLAW_GATEWAY_TOKEN=your-secret-token openclaw devices approve {requestId}"}'
```

The `OPENCLAW_GATEWAY_TOKEN` env var prefix is required because the agent's shell environment may not have the correct token set for the CLI client.

---

## 11. Dependencies

```bash
# Server-side proxy
npm install ws

# Device identity signing (client + server)
npm install @noble/ed25519

# Types
npm install -D @types/ws
```
