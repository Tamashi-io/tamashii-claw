# OpenClaw Gateway Integration — Fixes Summary

## 1. Connection & Authentication

### Removed dead `wss://openclaw-{hostname}` URL
- **Commit:** `30d0b50`
- **Problem:** Frontend tried `wss://openclaw-smith2.hyperclaw.app` which never resolves in DNS
- **Fix:** Only use `wss://smith2.hyperclaw.app` (from `agent.openclaw_url`)
- **File:** `src/hooks/useGatewayChat.ts`

### Ed25519 Device Identity
- **File:** `src/gateway-client.ts`
- **How it works:**
  1. Generate Ed25519 keypair on first connect, store in `localStorage` (`openclaw.device.auth.v1`)
  2. On `connect.challenge` event, sign a payload containing `deviceId`, `clientId`, `role`, `scopes`, `nonce`
  3. Send signed `connect` request with device identity + auth token
  4. On success, cache the `deviceToken` from `hello.auth.deviceToken` for instant reconnects
  5. On `AUTH_DEVICE_TOKEN_MISMATCH`, clear cached token and retry

### Auto-approve pairing with `requestId`
- **Commit:** `30d0b50`
- **Problem:** First-time device connections trigger `PAIRING_REQUIRED` with a `requestId`. Frontend was using `openclaw devices approve --yes` which doesn't work
- **Fix:** Read `gw.pairingRequestId` and run `openclaw devices approve {requestId}` via the exec API
- **File:** `src/hooks/useGatewayChat.ts`

---

## 2. Config Patching (Channels, Models)

### Gateway expects `{raw, baseHash}` format
- **Commits:** `ca7602d`, `f84aa5e`
- **Problem:** Gateway doesn't have `channels.upsert` or direct patch RPCs. `config.patch` expects:
  ```json
  { "raw": "<full config as JSON string>", "baseHash": "<hash from config.get>" }
  ```
  Not `{ "patch": { ... } }`
- **Fix:** `configPatch()` in `gateway-client.ts` implements read → deep merge → write:
  1. Call `config.get` to get current config + `baseHash`
  2. Deep merge the patch into current config
  3. Send `{ raw: JSON.stringify(merged), baseHash }` to `config.patch`
- **File:** `src/gateway-client.ts`

### Correct config field names

| Setting | Config Path | Notes |
|---------|------------|-------|
| Telegram bot token | `channels.telegram.botToken` | NOT `token` |
| Discord bot token | `channels.discord.token` | NOT `botToken` |
| Slack bot token | `channels.slack.botToken` | Same as Telegram |
| Default model | `agents.defaults.model.primary` | NOT root-level `defaultModel` |
| DM policy | `channels.telegram.dmPolicy` | Values: `pairing`, `open`, `allowlist`, `disabled` |

- **Files:** `src/components/console/ChannelsPanel.tsx`, `src/components/console/ModelsPanel.tsx`

---

## 3. Gateway Restart Handling

### Auto-reconnect on close code 1012
- **Commit:** `d8e9da7`
- **Problem:** Saving config (channels, models) causes the gateway to restart to pick up changes. WebSocket closes with code `1012`, pending RPCs reject with "Connection closed", and the UI shows a false error
- **Fix:**
  1. `configPatch()` catches `"Connection closed"` errors and treats them as success (config was applied before restart)
  2. `GatewayClient` exposes `onClose(handler)` for post-handshake disconnects
  3. `useGatewayChat` registers a close handler that auto-reconnects after 2s on code `1012`
  4. `intentionalCloseRef` prevents reconnect during component unmount
  5. `ChannelsPanel` resets its `loaded` flag when gateway instance changes so it reloads config after reconnect
- **Files:** `src/gateway-client.ts`, `src/hooks/useGatewayChat.ts`, `src/components/console/ChannelsPanel.tsx`

---

## 4. Chat Error Handling

### Handle `state="error"` events
- **Commit:** `cf26444`
- **Problem:** Chat event handler only checked `state === "final"` — never stopped the spinner on errors, leaving the UI stuck
- **Fix:** Added `else if (chatPayload.state === "error")` branch that stops the spinner and shows the error message in chat
- **File:** `src/hooks/useGatewayChat.ts`

---

## 5. Preflight Safety

### Stop overwriting model API keys
- **Commit:** `4af284f`
- **Problem:** Preflight script was injecting LiteLLM proxy keys into the agent's model providers. Those keys don't work with `api.agents.hypercli.com` (the agent's actual model endpoint), causing `Cannot read properties of undefined (reading 'type')` crashes
- **Fix:** Preflight now ONLY touches gateway config:
  - `gateway.mode` → `"local"`
  - `gateway.controlUi.allowedOrigins` → add frontend origin
  - `gateway.auth.token` → set default if missing
  - Does NOT touch `models.providers` or any API keys
- **File:** `src/hooks/useGatewayChat.ts`

---

## Key Files

| File | Purpose |
|------|---------|
| `src/gateway-client.ts` | WebSocket client with Ed25519 auth, `configPatch` (read-merge-write + baseHash), `deepMerge`, `onClose` handler |
| `src/hooks/useGatewayChat.ts` | URL construction, pairing approval, chat error handling, auto-reconnect, safe preflight |
| `src/components/console/ChannelsPanel.tsx` | Channel config UI — uses `configPatch()` with correct field names per channel |
| `src/components/console/ModelsPanel.tsx` | Model management UI — uses `configPatch()` with path `agents.defaults.model.primary` |

---

## Commits (chronological)

| Hash | Description |
|------|-------------|
| `30d0b50` | Remove dead openclaw- URL + use pairing requestId |
| `fd5ca00` | Debug logging for gateway messages |
| `bb6c143` | Fix ChannelsPanel to use config.patch |
| `cf26444` | Handle chat state='error' events |
| `4af284f` | Stop preflight from overwriting API keys |
| `ca7602d` | config.patch expects {raw: string} |
| `f84aa5e` | Include baseHash for optimistic concurrency |
| `d8e9da7` | Auto-reconnect after gateway restart |
| `56d2cea` | Fix ModelsPanel: use configPatch |
| `633c308` | Fix default model path: agents.defaults.model.primary |

---

## Known Issue

**Chat LLM responses not working** — The OpenClaw agent runtime crashes with `Cannot read properties of undefined (reading 'type')` when parsing a valid SSE stream from the model API. Direct API test confirms the endpoint (`api.agents.hypercli.com`) returns valid Anthropic Messages format responses. This is an agent-side bug in the OpenClaw runtime, not a frontend issue.
