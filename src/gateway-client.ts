/**
 * OpenClaw Gateway Client — Browser WebSocket client for OpenClaw Gateway protocol v3.
 *
 * Implements Ed25519 device identity for full operator scopes (matching HyperCLI SDK).
 */

import { getPublicKeyAsync, signAsync, utils as edUtils } from "@noble/ed25519";

const PROTOCOL_VERSION = 3;
const DEFAULT_TIMEOUT = 60_000;
const CHAT_TIMEOUT = 300_000;
const OPERATOR_ROLE = "operator";
const OPERATOR_SCOPES = ["operator.admin", "operator.approvals", "operator.pairing"];
const STORAGE_KEY = "openclaw.device.auth.v1";

export interface GatewayError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ChatEvent {
  type: "content" | "thinking" | "tool_call" | "tool_result" | "done" | "error" | "status";
  text?: string;
  data?: Record<string, unknown>;
}

export interface GatewayConfig {
  url: string;
  token?: string;
  gatewayToken?: string;
  clientId?: string;
  clientMode?: string;
}

type EventHandler = (event: string, payload: Record<string, unknown>) => void;
type ResolvedGatewayConfig = GatewayConfig & {
  gatewayToken: string;
  clientId: string;
  clientMode: string;
};

// ── Device Identity Types ──────────────────────────────────────────

interface DeviceIdentityRecord {
  deviceId: string;
  publicKey: string;
  privateKey: string;
  createdAtMs: number;
}

interface DeviceTokenEntry {
  token: string;
  role: string;
  scopes: string[];
  updatedAtMs: number;
  gatewayUrl?: string;
}

interface DeviceAuthStore {
  version: 1;
  deviceId?: string;
  publicKey?: string;
  privateKey?: string;
  createdAtMs?: number;
  tokens?: Record<string, DeviceTokenEntry>;
}

// ── Device Identity Helpers ────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (v) => v.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) output[i] = binary.charCodeAt(i);
  return output;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return bytesToHex(new Uint8Array(digest));
}

function readDeviceAuthStore(): DeviceAuthStore | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeviceAuthStore;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function writeDeviceAuthStore(store: DeviceAuthStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch { /* ignore storage errors */ }
}

function storageScopeKey(scope: string, role: string): string {
  return `${scope.trim()}|${role.trim()}`;
}

function loadStoredDeviceToken(deviceId: string, scope: string, role: string): DeviceTokenEntry | null {
  const store = readDeviceAuthStore();
  if (!store || store.deviceId !== deviceId || !store.tokens) return null;
  const entry = store.tokens[storageScopeKey(scope, role)];
  return entry && typeof entry.token === "string" ? entry : null;
}

function storeStoredDeviceToken(params: {
  deviceId: string;
  scope: string;
  gatewayUrl?: string;
  role: string;
  token: string;
  scopes?: string[];
}): void {
  const key = storageScopeKey(params.scope, params.role);
  const existing = readDeviceAuthStore();
  writeDeviceAuthStore({
    version: 1,
    ...(existing?.deviceId ? { deviceId: existing.deviceId } : { deviceId: params.deviceId }),
    ...(existing?.publicKey ? { publicKey: existing.publicKey } : {}),
    ...(existing?.privateKey ? { privateKey: existing.privateKey } : {}),
    ...(typeof existing?.createdAtMs === "number" ? { createdAtMs: existing.createdAtMs } : {}),
    tokens: {
      ...(existing?.tokens ?? {}),
      [key]: {
        token: params.token,
        role: params.role,
        scopes: params.scopes ?? [],
        updatedAtMs: Date.now(),
        ...(params.gatewayUrl ? { gatewayUrl: params.gatewayUrl } : {}),
      },
    },
  });
}

function clearStoredDeviceToken(deviceId: string, scope: string, role: string): void {
  const store = readDeviceAuthStore();
  if (!store || store.deviceId !== deviceId || !store.tokens) return;
  const key = storageScopeKey(scope, role);
  if (!store.tokens[key]) return;
  const nextTokens = { ...store.tokens };
  delete nextTokens[key];
  writeDeviceAuthStore({ ...store, tokens: nextTokens });
}

async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentityRecord> {
  const store = readDeviceAuthStore();
  if (
    store?.version === 1 &&
    typeof store.deviceId === "string" &&
    typeof store.publicKey === "string" &&
    typeof store.privateKey === "string"
  ) {
    // Verify deviceId matches publicKey
    const derivedId = await sha256Hex(base64UrlToBytes(store.publicKey));
    if (derivedId !== store.deviceId) {
      writeDeviceAuthStore({ ...store, version: 1, deviceId: derivedId });
    }
    return {
      deviceId: derivedId,
      publicKey: store.publicKey,
      privateKey: store.privateKey,
      createdAtMs: store.createdAtMs ?? Date.now(),
    };
  }

  // Generate new Ed25519 keypair
  const privateKeyBytes = edUtils.randomSecretKey();
  const publicKeyBytes = await getPublicKeyAsync(privateKeyBytes);
  const deviceId = await sha256Hex(publicKeyBytes);
  const identity: DeviceIdentityRecord = {
    deviceId,
    publicKey: bytesToBase64Url(publicKeyBytes),
    privateKey: bytesToBase64Url(privateKeyBytes),
    createdAtMs: Date.now(),
  };
  writeDeviceAuthStore({
    version: 1,
    ...identity,
    ...(store?.tokens ? { tokens: store.tokens } : {}),
  });
  console.log("[gateway] Generated new device identity:", deviceId.slice(0, 12) + "...");
  return identity;
}

function buildDeviceAuthPayload(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token?: string | null;
  nonce: string;
}): string {
  return [
    "v2",
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(","),
    String(params.signedAtMs),
    params.token ?? "",
    params.nonce,
  ].join("|");
}

async function signDevicePayload(privateKey: string, payload: string): Promise<string> {
  const signature = await signAsync(new TextEncoder().encode(payload), base64UrlToBytes(privateKey));
  return bytesToBase64Url(signature);
}

// ── Helpers ────────────────────────────────────────────────────────

// ── Gateway Client ─────────────────────────────────────────────────

export type CloseHandler = (code: number, reason: string) => void;

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void; timer: ReturnType<typeof setTimeout> }>();
  private eventHandlers: EventHandler[] = [];
  private closeHandlers: CloseHandler[] = [];
  private config: ResolvedGatewayConfig;
  private _connected = false;
  private _version: string | null = null;
  private _protocol: number | null = null;

  /** Set after a PAIRING_REQUIRED error — caller can use this to auto-approve */
  public pairingRequestId: string | null = null;

  private async readData(data: unknown): Promise<string> {
    if (typeof data === "string") return data;
    if (data instanceof Blob) return data.text();
    if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
    return String(data);
  }

  constructor(config: GatewayConfig) {
    this.config = {
      gatewayToken: "tamashiiclaw-gateway-auth",
      clientId: "cli",
      clientMode: "cli",
      ...config,
    };
  }

  get connected() { return this._connected; }
  get version() { return this._version; }
  get protocol() { return this._protocol; }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.token
        ? `${this.config.url}?token=${encodeURIComponent(this.config.token)}`
        : this.config.url;
      this.ws = new WebSocket(wsUrl);

      let handshakePhase: "challenge" | "hello" | "done" = "challenge";
      const timeout = setTimeout(() => {
        reject(new Error("Gateway handshake timeout"));
        this.ws?.close();
      }, DEFAULT_TIMEOUT);

      this.ws.onmessage = async (ev) => {
        const msg = JSON.parse(await this.readData(ev.data));

        if (handshakePhase === "challenge") {
          if (msg.event !== "connect.challenge") {
            clearTimeout(timeout);
            reject(new Error(`Expected connect.challenge, got ${msg.event}`));
            return;
          }

          // Extract nonce from challenge for device identity signing
          const nonce = msg.payload?.nonce ?? "";
          handshakePhase = "hello";

          try {
            // Build device-identity-signed connect message
            const identity = await loadOrCreateDeviceIdentity();
            const storedToken = loadStoredDeviceToken(
              identity.deviceId,
              this.config.url,
              OPERATOR_ROLE,
            )?.token;
            const authToken = storedToken ?? this.config.gatewayToken;
            const signedAtMs = Date.now();

            const payload = buildDeviceAuthPayload({
              deviceId: identity.deviceId,
              clientId: this.config.clientId,
              clientMode: this.config.clientMode,
              role: OPERATOR_ROLE,
              scopes: OPERATOR_SCOPES,
              signedAtMs,
              token: authToken,
              nonce,
            });
            const signature = await signDevicePayload(identity.privateKey, payload);

            const connectParams: Record<string, any> = {
              minProtocol: PROTOCOL_VERSION,
              maxProtocol: PROTOCOL_VERSION,
              client: {
                id: this.config.clientId,
                version: "tamashiiclaw-frontend",
                platform: "browser",
                mode: this.config.clientMode,
              },
              role: OPERATOR_ROLE,
              scopes: [...OPERATOR_SCOPES],
              device: {
                id: identity.deviceId,
                publicKey: identity.publicKey,
                signature,
                signedAt: signedAtMs,
                nonce,
              },
              caps: ["tool-events"],
            };

            // Include auth token if available
            if (authToken) {
              connectParams.auth = { token: authToken };
            }

            this.ws!.send(JSON.stringify({
              type: "req",
              id: this.makeId(),
              method: "connect",
              params: connectParams,
            }));
          } catch (err) {
            clearTimeout(timeout);
            reject(new Error(`Device identity error: ${err instanceof Error ? err.message : String(err)}`));
          }
          return;
        }

        if (handshakePhase === "hello" && msg.type === "res") {
          clearTimeout(timeout);
          if (msg.ok) {
            this._connected = true;
            this._version = msg.payload?.version ?? msg.payload?.server?.version ?? null;
            this._protocol = msg.payload?.protocol ?? null;
            handshakePhase = "done";
            this.ws!.onmessage = async (ev2) => this.handleMessage(JSON.parse(await this.readData(ev2.data)));

            // Cache device token from hello response for future reconnects
            if (msg.payload?.auth?.deviceToken) {
              try {
                const store = readDeviceAuthStore();
                if (store?.deviceId) {
                  storeStoredDeviceToken({
                    deviceId: store.deviceId,
                    scope: this.config.url,
                    gatewayUrl: this.config.url,
                    role: msg.payload.auth.role ?? OPERATOR_ROLE,
                    token: msg.payload.auth.deviceToken,
                    scopes: msg.payload.auth.scopes ?? [],
                  });
                  console.log("[gateway] Cached device token for future reconnects");
                }
              } catch { /* ignore */ }
            }

            resolve();
          } else {
            const errorCode = msg.error?.details?.code ?? msg.error?.code ?? "";
            const errorMsg = msg.error?.message ?? "Connection rejected";

            // Handle PAIRING_REQUIRED — store request ID for caller to handle
            if (errorCode === "PAIRING_REQUIRED") {
              this.pairingRequestId = msg.error?.details?.requestId ?? null;
              // Clear any stale device token
              const store = readDeviceAuthStore();
              if (store?.deviceId) {
                clearStoredDeviceToken(store.deviceId, this.config.url, OPERATOR_ROLE);
              }
            }

            // Handle device token mismatch — clear cache and let caller retry
            if (errorCode === "AUTH_DEVICE_TOKEN_MISMATCH") {
              const store = readDeviceAuthStore();
              if (store?.deviceId) {
                clearStoredDeviceToken(store.deviceId, this.config.url, OPERATOR_ROLE);
              }
            }

            reject(new Error(errorMsg));
          }
          return;
        }
      };

      this.ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("WebSocket error"));
      };

      this.ws.onclose = (ev) => {
        console.log("[gateway] WebSocket closed:", ev.code, ev.reason);
        const wasConnected = this._connected;
        this._connected = false;
        for (const [, { reject: rej, timer }] of this.pending) {
          clearTimeout(timer);
          rej(new Error("Connection closed"));
        }
        this.pending.clear();
        // If the WebSocket closed before the handshake finished, reject the
        // connect() Promise immediately instead of waiting for the 60s timeout.
        // This happens when the backend proxy closes early (e.g. upstream 503).
        if (handshakePhase !== "done") {
          clearTimeout(timeout);
          const reason = ev.reason ? `${ev.code} ${ev.reason}` : `WebSocket closed (${ev.code})`;
          reject(new Error(reason));
          return;
        }
        // Notify close handlers (only after successful handshake)
        if (wasConnected) {
          for (const h of this.closeHandlers) {
            try { h(ev.code, ev.reason ?? ""); } catch { /* ignore */ }
          }
        }
      };
    });
  }

  close() {
    this._connected = false;
    this.ws?.close();
  }

  onEvent(handler: EventHandler) {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
    };
  }

  /** Register a handler called when the WebSocket closes (after handshake). */
  onClose(handler: CloseHandler) {
    this.closeHandlers.push(handler);
    return () => {
      this.closeHandlers = this.closeHandlers.filter(h => h !== handler);
    };
  }

  private makeId(): string {
    return crypto.randomUUID();
  }

  private handleMessage(msg: any) {
    // Debug: log all incoming messages
    if (msg.type === "event") {
      console.log("[gateway] ← event:", msg.event, msg.payload ? JSON.stringify(msg.payload).slice(0, 200) : "");
    } else {
      console.log("[gateway] ← msg:", msg.type, msg.id?.slice(0, 8), msg.ok, msg.error ? JSON.stringify(msg.error).slice(0, 200) : "");
    }

    if (msg.type === "res") {
      const entry = this.pending.get(msg.id);
      if (entry) {
        clearTimeout(entry.timer);
        this.pending.delete(msg.id);
        entry.resolve(msg);
      }
    } else if (msg.type === "event") {
      for (const h of this.eventHandlers) {
        try { h(msg.event, msg.payload ?? {}); } catch { /* ignore */ }
      }
    }
  }

  async call<T = any>(method: string, params?: Record<string, unknown>, timeout = DEFAULT_TIMEOUT): Promise<T> {
    if (!this._connected || !this.ws) throw new Error("Not connected");

    const id = this.makeId();
    const req = { type: "req", id, method, ...(params ? { params } : {}) };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC ${method} timed out`));
      }, timeout);

      this.pending.set(id, {
        resolve: (resp: any) => {
          if (resp.ok) resolve(resp.payload);
          else reject(new Error(resp.error?.message ?? `RPC ${method} failed`));
        },
        reject,
        timer,
      });

      this.ws!.send(JSON.stringify(req));
    });
  }

  /** Raw config.get result including baseHash for optimistic concurrency */
  private async configGetRaw(): Promise<{ config: Record<string, unknown>; baseHash?: string }> {
    const r = await this.call<any>("config.get");
    const baseHash = r.hash ?? r.baseHash ?? undefined;
    let config: Record<string, unknown>;
    if (r.parsed) {
      config = r.parsed;
    } else if (r.raw) {
      try { config = JSON.parse(r.raw); } catch { config = r.config ?? r; }
    } else {
      config = r.config ?? r;
    }
    return { config, baseHash };
  }

  async configGet(): Promise<Record<string, unknown>> {
    const { config } = await this.configGetRaw();
    return config;
  }

  async configSchema(): Promise<Record<string, unknown>> {
    return this.call("config.schema");
  }

  async configPatch(patch: Record<string, unknown>): Promise<void> {
    // Gateway does server-side merge — just send the patch + baseHash for
    // optimistic concurrency (matches HyperCLI SDK 2026.3.20 behavior).
    const r = await this.call<any>("config.get");
    const baseHash = r.hash ?? r.baseHash ?? "";
    try {
      await this.call("config.patch", {
        raw: JSON.stringify(patch),
        baseHash,
      }, 30_000);
    } catch (err) {
      // Gateway restarts after config changes — if the WebSocket closed
      // right after sending, the config was almost certainly applied.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "Connection closed") {
        console.log("[gateway] config.patch succeeded (gateway restarting to apply changes)");
        return; // Treat as success
      }
      throw err;
    }
  }

  async modelsList(): Promise<any[]> {
    const r = await this.call<any>("models.list");
    return r.models ?? [];
  }

  async agentsList(): Promise<any[]> {
    const r = await this.call<any>("agents.list");
    const agents = r.agents ?? [];
    return agents.map((a: any) => ({ ...a, id: a.agentId ?? a.id }));
  }

  async filesList(agentId: string): Promise<any[]> {
    const r = await this.call<any>("agents.files.list", { agentId });
    return r.files ?? [];
  }

  async fileGet(agentId: string, name: string): Promise<string> {
    const r = await this.call<any>("agents.files.get", { agentId, name });
    return r.content ?? "";
  }

  async fileSet(agentId: string, name: string, content: string): Promise<void> {
    await this.call("agents.files.set", { agentId, name, content });
  }

  async sessionsList(limit = 20): Promise<any[]> {
    const r = await this.call<any>("sessions.list", { limit });
    return r.sessions ?? [];
  }

  async sessionsPatch(patch: Record<string, unknown> & { key: string }): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>("sessions.patch", patch);
  }

  async chatHistory(sessionKey?: string, limit = 50): Promise<any[]> {
    const params: Record<string, unknown> = { limit };
    if (sessionKey) params.sessionKey = sessionKey;
    const r = await this.call<any>("chat.history", params);
    return r.messages ?? [];
  }

  async chatSend(message: string, sessionKey?: string, agentId?: string): Promise<any> {
    const params: Record<string, unknown> = {
      message,
      sessionKey: sessionKey ?? "main",
      idempotencyKey: crypto.randomUUID(),
    };
    if (agentId) params.agentId = agentId;
    return this.call("chat.send", params, CHAT_TIMEOUT);
  }

  async chatAbort(sessionKey?: string): Promise<void> {
    const params: Record<string, unknown> = {};
    if (sessionKey) params.sessionKey = sessionKey;
    await this.call("chat.abort", params);
  }

  async cronList(): Promise<any[]> {
    const r = await this.call<any>("cron.list");
    return r.jobs ?? [];
  }

  async cronAdd(job: Record<string, unknown>): Promise<any> {
    return this.call("cron.add", { job });
  }

  async cronRemove(jobId: string): Promise<void> {
    await this.call("cron.remove", { jobId });
  }

  async cronRun(jobId: string): Promise<any> {
    return this.call("cron.run", { jobId });
  }

  async execApprove(execId: string): Promise<void> {
    await this.call("exec.approve", { execId });
  }

  async execDeny(execId: string): Promise<void> {
    await this.call("exec.deny", { execId });
  }
}
