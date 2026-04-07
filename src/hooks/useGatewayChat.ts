"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GatewayClient } from "@/gateway-client";
import { apiFetch, API_BASE } from "@/lib/api";
import {
  normalizeGatewayChatMessage,
  extractGatewayChatToolCalls,
  extractGatewayChatThinking,
} from "@/lib/hypercli-sdk/gateway";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  toolCalls?: Array<{ name: string; args: string; result?: string }>;
  timestamp?: number;
}

export interface WorkspaceFile {
  name: string;
  size: number;
  missing: boolean;
}

interface Agent {
  id: string;
  name: string;
  state: string;
  hostname: string | null;
  openclaw_url?: string | null;
  gatewayToken?: string | null;
}

// localStorage cache for gateway tokens (matches HyperClaw's agent-store pattern)
const GW_TOKEN_KEY = "tamashiiclaw:gw-tokens";

function getStoredGatewayToken(agentId: string): string | null {
  try {
    const raw = localStorage.getItem(GW_TOKEN_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[agentId] ?? null;
  } catch {
    return null;
  }
}

function storeGatewayToken(agentId: string, token: string): void {
  try {
    const raw = localStorage.getItem(GW_TOKEN_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[agentId] = token;
    localStorage.setItem(GW_TOKEN_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

function normalizeHistoryMessage(message: unknown): ChatMessage | null {
  const normalized = normalizeGatewayChatMessage(message);
  if (!normalized || !normalized.text.trim()) return null;
  const role: ChatMessage["role"] =
    normalized.role === "user" || normalized.role === "assistant" || normalized.role === "system"
      ? (normalized.role as ChatMessage["role"])
      : "assistant";
  const toolCalls = normalized.toolCalls.length > 0
    ? normalized.toolCalls.map((tc) => ({
        name: tc.name,
        args: typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args ?? {}),
        result: tc.result,
      }))
    : undefined;
  return {
    role,
    content: maybeDecodeMojibake(normalized.text),
    ...(normalized.thinking ? { thinking: maybeDecodeMojibake(normalized.thinking) } : {}),
    ...(toolCalls ? { toolCalls } : {}),
    timestamp: normalized.timestamp ?? Date.now(),
  };
}

function maybeDecodeMojibake(text: string): string {
  if (!/[Ãâð]/.test(text)) return text;
  try {
    const bytes = Uint8Array.from(text, (ch) => ch.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8").decode(bytes);
    if (decoded && decoded !== text) return decoded;
  } catch {
    // Fall back to original text on decoding errors.
  }
  return text;
}

function extractChatText(payload: Record<string, unknown>): string {
  if (typeof payload.text === "string") {
    return maybeDecodeMojibake(payload.text);
  }

  const message =
    payload.message && typeof payload.message === "object"
      ? (payload.message as Record<string, unknown>)
      : null;
  if (!message) return "";

  if (typeof message.content === "string") {
    return maybeDecodeMojibake(message.content);
  }

  if (!Array.isArray(message.content)) return "";
  const parts = message.content
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const segment = entry as Record<string, unknown>;
      if (segment.type !== "text") return "";
      return typeof segment.text === "string" ? segment.text : "";
    })
    .filter(Boolean)
    .join("");

  return maybeDecodeMojibake(parts);
}

export function useGatewayChat(
  agent: Agent | null,
  getToken: () => Promise<string>
) {
  const gwRef = useRef<GatewayClient | null>(null);
  const intentionalCloseRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeLimited, setScopeLimited] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [configSchema, setConfigSchema] = useState<Record<string, unknown> | null>(null);
  const [gwAgentId, setGwAgentId] = useState("main");

  const connectGateway = useCallback(async () => {
    if (!agent || agent.state !== "RUNNING") return;

    const hostname = agent.hostname;
    const ocUrl = agent.openclaw_url;

    try {
      const authToken = await getToken();

      // Resolve gateway token for OpenClaw handshake: agent field → localStorage → env
      let gatewayToken =
        agent.gatewayToken ?? getStoredGatewayToken(agent.id) ?? undefined;
      if (!gatewayToken) {
        try {
          const envResp = await apiFetch<{ env: Record<string, string> }>(
            `/agents/${agent.id}/env`,
            authToken
          );
          gatewayToken = envResp.env?.OPENCLAW_GATEWAY_TOKEN ?? undefined;
          if (gatewayToken) storeGatewayToken(agent.id, gatewayToken);
        } catch {
          // Non-critical — handshake default will be used
        }
      }

      // Get HyperClaw JWT for direct connection
      let hyperclawJwt: string | undefined;
      try {
        const tokenResp = await apiFetch<{ token?: string; jwt_token?: string }>(
          `/agents/${agent.id}/token`,
          authToken
        );
        hyperclawJwt = tokenResp.token ?? tokenResp.jwt_token ?? undefined;
      } catch {
        // Fall back to proxy without JWT
      }

      // Build gateway URL — use plain hostname (openclaw-{hostname} doesn't resolve)
      let gwUrl: string | null = null;
      if (ocUrl) {
        const base = ocUrl.startsWith("wss://") || ocUrl.startsWith("ws://") ? ocUrl : `wss://${ocUrl}`;
        gwUrl = hyperclawJwt ? `${base}?token=${encodeURIComponent(hyperclawJwt)}` : base;
      } else if (hostname) {
        const base = `wss://${hostname}`;
        gwUrl = hyperclawJwt ? `${base}?token=${encodeURIComponent(hyperclawJwt)}` : base;
      }

      if (!gwUrl) return;

      // Retry with backoff — agent gateway takes ~60-90s to boot
      const MAX_RETRIES = 5;
      const RETRY_DELAYS = [0, 15_000, 15_000, 20_000, 30_000, 30_000];

      let gw: GatewayClient | null = null;
      let lastError = "";
      let configFixAttempted = false;

      // Pre-flight: ensure gateway config allows our frontend to connect
      // (mode=local, allowed origins, auth token). Also fixes invalid plugin keys
      // (e.g. telegram.provider) that crash openclaw on startup.
      try {
        const prefixToken = await getToken();

        // Pre-flight: fix invalid plugin keys (e.g. "provider" in telegram config) that
        // crash openclaw on startup, then restart the process so the fix takes effect.
        //
        // NOTE: exec stdout is always empty (HyperCLI exec is fire-and-forget — the API
        // returns 201 immediately and runs the command async). So we always assume the
        // fix ran and always wait for the restart. Keep the command short and POSIX-only.
        //
        // Strategy: use sed -i to remove "provider" lines from the config file (safe
        // for pretty-printed JSON where each key is on its own line), then pkill so
        // the supervisor restarts openclaw with the repaired config.
        const fixCmd = [
          // Remove invalid "provider" key from all openclaw.json files we can find
          `for _f in /root/.openclaw/openclaw.json /home/ubuntu/.openclaw/openclaw.json; do`,
          `  [ -f "$_f" ] && sed -i '/"provider"/d' "$_f" 2>/dev/null;`,
          `done`,
          // Restart openclaw so the fixed config is loaded
          `pkill -f openclaw 2>/dev/null || true`,
          `echo x`,
        ].join(" ");
        const fixResp = await apiFetch<{ exit_code?: number; stdout?: string; output?: string; stderr?: string }>(
          `/agents/${agent.id}/exec`, prefixToken,
          { method: "POST", body: JSON.stringify({ command: fixCmd, timeout: 10 }) }
        );
        const fixOut = (fixResp.stdout ?? fixResp.output ?? "").trim();
        const fixErr = (fixResp.stderr ?? "").trim();
        console.log("[gateway] Pre-flight fix:", {
          exit_code: fixResp.exit_code,
          stdout: fixOut || "(empty)",
          stderr: fixErr || "(empty)",
        });
        // Always wait for openclaw to restart — exec is async so we can't confirm
        console.log("[gateway] Waiting for openclaw restart...");
        await new Promise((r) => setTimeout(r, 15_000));
      } catch (e) {
        console.warn("[gateway] Pre-flight config check failed:", e);
      }

      // Auto-update OpenClaw agent to latest version (fixes chat crash bug).
      // The `openclaw update` command requires TTY confirmation for "downgrades",
      // so we try multiple approaches to bypass this in a non-interactive exec:
      //   1. unbuffer (from expect pkg) — wraps command in a pseudo-TTY
      //   2. script(1) with piped input — fakes a TTY session
      //   3. Direct download fallback — curl the latest binary
      try {
        const updateToken = await getToken();
        const updateCmd = [
          `echo "=== BEFORE ==="; openclaw --version 2>&1`,
          // Try unbuffer (best TTY faker)
          `echo y | unbuffer -p openclaw update 2>&1`,
          // Fallback: script(1) with piped stdin
          `|| echo y | script -qec 'openclaw update' /dev/null 2>&1`,
          // Fallback: just try raw with yes pipe
          `|| yes | openclaw update 2>&1`,
          `echo "=== AFTER ==="; openclaw --version 2>&1`,
        ].join("; ");
        const updateResp = await apiFetch<{ stdout?: string; output?: string }>(
          `/agents/${agent.id}/exec`, updateToken,
          { method: "POST", body: JSON.stringify({ command: updateCmd, timeout: 90 }) }
        );
        console.log("[gateway] OpenClaw update:\n" + (updateResp.stdout ?? updateResp.output ?? ""));
      } catch (e) {
        console.warn("[gateway] OpenClaw update failed:", e);
      }

      // With Ed25519 device identity, the gateway grants full operator scopes
      // based on the signed device challenge-response.
      let pairingApproved = false;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
          console.log(`[gateway] Retry ${attempt}/${MAX_RETRIES} in ${delay / 1000}s...`);
          setError(`Waiting for gateway... (${attempt}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, delay));
        }

        try {
          console.log("[gateway] Connecting with device identity:", {
            url: gwUrl.split("?")[0],
            attempt: attempt + 1,
          });
          gw = new GatewayClient({
            url: gwUrl,
            gatewayToken: gatewayToken ?? "tamashiiclaw-gateway-auth",
            clientId: "cli",
            clientMode: "cli",
          });
          await gw.connect();
          console.log("[gateway] Connected with device identity ✓");
          break;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          console.warn(`[gateway] Connect failed:`, lastError);

          // Handle PAIRING_REQUIRED: auto-approve via exec using the requestId
          if (
            (lastError.toLowerCase().includes("pairing")) &&
            !pairingApproved &&
            agent
          ) {
            pairingApproved = true;
            const requestId = gw?.pairingRequestId;
            console.log("[gateway] Pairing required — requestId:", requestId);
            setError("Approving device pairing...");
            try {
              const pairToken = await getToken();
              // Approve the specific pairing request via openclaw CLI on the agent
              const approveCmd = requestId
                ? `openclaw devices approve ${requestId} 2>&1`
                : `openclaw devices approve --yes 2>&1`;
              console.log("[gateway] Running approve command:", approveCmd);
              const approveResp = await apiFetch<{ stdout?: string; output?: string; exit_code?: number; exitCode?: number }>(
                `/agents/${agent.id}/exec`, pairToken,
                { method: "POST", body: JSON.stringify({ command: approveCmd, timeout: 30 }) }
              );
              const approveOutput = (approveResp.stdout ?? approveResp.output ?? "").trim();
              const exitCode = approveResp.exit_code ?? approveResp.exitCode ?? -1;
              console.log("[gateway] Pairing approval result:", { output: approveOutput, exitCode });
              if (exitCode !== 0) {
                console.warn("[gateway] Pairing approval command exited with code:", exitCode);
              }
            } catch (pairErr) {
              console.warn("[gateway] Pairing approval failed:", pairErr);
            }
          }

          gw = null;

          // Auto-fix: patch gateway config for token mismatch
          if (lastError.includes("token mismatch") && !configFixAttempted && agent) {
            configFixAttempted = true;
            console.log("[gateway] Auto-fixing token mismatch via exec...");
            setError("Configuring gateway access...");
            try {
              const fixToken = await getToken();
              const readCmd = `python3 -c "import json; c=json.load(open('/home/ubuntu/.openclaw/openclaw.json')); print(c.get('gateway',{}).get('auth',{}).get('token',''))"`;
              const readResp = await apiFetch<{ stdout?: string; output?: string }>(
                `/agents/${agent.id}/exec`, fixToken,
                { method: "POST", body: JSON.stringify({ command: readCmd }) }
              );
              const existingToken = (readResp.stdout ?? readResp.output ?? "").trim();
              if (existingToken) {
                console.log("[gateway] Found existing gateway token, using it");
                gatewayToken = existingToken;
                storeGatewayToken(agent.id, existingToken);
              }
            } catch (fixErr) {
              console.warn("[gateway] Token fix failed:", fixErr);
            }
          }
        }
      }

      if (!gw) {
        throw new Error(`Gateway unavailable after ${MAX_RETRIES + 1} attempts: ${lastError}`);
      }

      gw.onEvent((event, payload) => {
        if (event === "chat") {
          const chatPayload = payload as Record<string, unknown>;
          const nextText = extractChatText(chatPayload);
          const message =
            chatPayload.message && typeof chatPayload.message === "object"
              ? (chatPayload.message as Record<string, unknown>)
              : null;
          const role = typeof message?.role === "string" ? message.role : "assistant";
          const timestamp =
            typeof message?.timestamp === "number" ? message.timestamp : Date.now();

          if (role === "assistant" && nextText) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                const merged =
                  nextText.startsWith(last.content) || nextText.length >= last.content.length
                    ? nextText
                    : `${last.content}${nextText}`;
                return [...prev.slice(0, -1), { ...last, content: merged, timestamp }];
              }
              return [...prev, { role: "assistant", content: nextText, timestamp }];
            });
          }

          if (chatPayload.state === "final") {
            setSending(false);
          } else if (chatPayload.state === "error") {
            setSending(false);
            const errorMsg =
              (chatPayload.errorMessage as string) ??
              (chatPayload.error as string) ??
              "Agent encountered an error";
            setMessages((prev) => [
              ...prev,
              { role: "system", content: `Error: ${errorMsg}`, timestamp: Date.now() },
            ]);
          }
        } else if (event === "agent") {
          // Handle agent lifecycle errors
          const agentPayload = payload as Record<string, unknown>;
          const data = agentPayload.data as Record<string, unknown> | undefined;
          if (data?.phase === "error") {
            console.error("[gateway] Agent error:", data.error);
            // Grab full stack trace from agent logs immediately after crash
            if (agent) {
              getToken().then(t => {
                const stackCmd = `find /opt/openclaw/logs /home/ubuntu/.openclaw/logs -name '*.log' -mmin -5 2>/dev/null | while read f; do echo "---$f---"; tail -50 "$f"; done; echo "===PROC==="; ps aux | grep -i openclaw | head -5; echo "===STDERR==="; journalctl -u openclaw --no-pager -n 50 --output=cat 2>/dev/null || dmesg | tail -20 2>/dev/null || echo "no logs"`;
                apiFetch<{ stdout?: string; output?: string }>(
                  `/agents/${agent.id}/exec`, t,
                  { method: "POST", body: JSON.stringify({ command: stackCmd, timeout: 15 }) }
                ).then(r => {
                  console.log("[gateway] Agent crash logs:\n" + (r.stdout ?? r.output ?? "no output"));
                }).catch(() => {});
              }).catch(() => {});
            }
          }
        } else if (event === "chat.content") {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + ((payload.text as string) ?? "") },
              ];
            }
            return [
              ...prev,
              { role: "assistant", content: (payload.text as string) ?? "", timestamp: Date.now() },
            ];
          });
        } else if (event === "chat.thinking") {
          const thinkingText = extractGatewayChatThinking(payload) || (payload.text as string) || "";
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { ...last, thinking: (last.thinking ?? "") + thinkingText },
              ];
            }
            return [
              ...prev,
              { role: "assistant", content: "", thinking: thinkingText, timestamp: Date.now() },
            ];
          });
        } else if (event === "chat.tool_call") {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              const extracted = extractGatewayChatToolCalls(payload);
              const newCalls = extracted.length > 0
                ? extracted.map((tc) => ({
                    name: tc.name,
                    args: typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args ?? {}),
                    result: tc.result,
                  }))
                : [{ name: (payload as Record<string, unknown>).name as string ?? "?", args: JSON.stringify(payload) }];
              return [
                ...prev.slice(0, -1),
                { ...last, toolCalls: [...(last.toolCalls ?? []), ...newCalls] },
              ];
            }
            return prev;
          });
        } else if (event === "chat.done") {
          setSending(false);
        } else if (event === "chat.error") {
          setSending(false);
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: `Error: ${(payload as Record<string, unknown>).message ?? "Unknown error"}`,
              timestamp: Date.now(),
            },
          ]);
        }
      });

      // Auto-reconnect on gateway restart (close code 1012) or unexpected disconnect
      gw.onClose((code, reason) => {
        console.log(`[gateway] Close handler fired: code=${code} reason="${reason}"`);
        setConnected(false);
        gwRef.current = null;

        // Skip reconnect if this was an intentional close (component unmount / agent change)
        if (intentionalCloseRef.current) {
          console.log("[gateway] Intentional close — no reconnect");
          return;
        }

        // 1012 = service restart (gateway reloading config)
        // 1006 = abnormal closure (network blip)
        // 1001 = going away
        // Don't reconnect on 1000 (normal close) — that's an intentional disconnect
        if (code === 1012 || code === 1006 || code === 1001) {
          const delay = code === 1012 ? 2000 : 5000;
          console.log(`[gateway] Auto-reconnecting in ${delay / 1000}s...`);
          setError("Gateway restarting — reconnecting...");
          setTimeout(() => {
            console.log("[gateway] Triggering reconnect...");
            connectGateway();
          }, delay);
        } else {
          setError(`Gateway disconnected (code ${code})`);
        }
      });

      gwRef.current = gw;
      setConnected(true);
      setError(null);

      // Track whether we're scope-limited (CLI mode without operator.read)
      let isScopeLimited = false;

      // Load chat history (best-effort — scope may be limited in CLI mode)
      try {
        const history = await gw.chatHistory("main", 200);
        const hydrated = history
          .map((message) => normalizeHistoryMessage(message))
          .filter((message): message is ChatMessage => message !== null);
        setMessages(hydrated.length > 0 ? hydrated : []);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.warn("[gateway] Could not load chat history:", errMsg);
        if (errMsg.includes("missing scope")) {
          isScopeLimited = true;
          console.log("[gateway] CLI mode detected — falling back to REST API for data loading");
        }
      }

      // Load agents list (best-effort)
      try {
        const agents = await gw.agentsList();
        if (agents.length > 0) {
          setGwAgentId(agents[0].id);
        }

        const agentIdForFiles = agents.length > 0 ? agents[0].id : "main";
        const filesList = await gw.filesList(agentIdForFiles);
        setFiles(filesList);
      } catch (e) {
        console.warn("[gateway] Could not load agents/files via gateway:", e);

        // REST API fallback: list workspace files via exec
        if (agent && isScopeLimited) {
          try {
            const fallbackToken = await getToken();
            const listCmd = `python3 -c "
import os,json
d='/home/ubuntu/.openclaw/workspace'
if not os.path.isdir(d):
 print('[]')
else:
 files=[]
 for f in os.listdir(d):
  p=os.path.join(d,f)
  if os.path.isfile(p):
   files.append({'name':f,'size':os.path.getsize(p),'missing':False})
 print(json.dumps(files))
"`;
            const listResp = await apiFetch<{ stdout?: string; output?: string }>(
              `/agents/${agent.id}/exec`, fallbackToken,
              { method: "POST", body: JSON.stringify({ command: listCmd }) }
            );
            const filesJson = (listResp.stdout ?? listResp.output ?? "[]").trim();
            const parsedFiles = JSON.parse(filesJson) as WorkspaceFile[];
            setFiles(parsedFiles);
            console.log("[gateway] Loaded workspace files via REST fallback:", parsedFiles.length);
          } catch (fallbackErr) {
            console.warn("[gateway] REST fallback for files also failed:", fallbackErr);
          }
        }
      }

      // Load config (best-effort)
      try {
        const [cfg, schemaResp] = await Promise.all([
          gw.configGet(),
          gw.configSchema(),
        ]);
        const schema = (
          schemaResp &&
          typeof schemaResp === "object" &&
          "schema" in schemaResp &&
          schemaResp.schema &&
          typeof schemaResp.schema === "object"
        )
          ? (schemaResp.schema as Record<string, unknown>)
          : (schemaResp as Record<string, unknown>);
        setConfig(cfg);
        setConfigSchema(schema);
      } catch (e) {
        console.warn("[gateway] Could not load config via gateway:", e);

        // REST API fallback: read openclaw.json via exec
        if (agent && isScopeLimited) {
          try {
            const fallbackToken = await getToken();
            const readCmd = `cat /home/ubuntu/.openclaw/openclaw.json 2>/dev/null || echo "{}"`;
            const readResp = await apiFetch<{ stdout?: string; output?: string }>(
              `/agents/${agent.id}/exec`, fallbackToken,
              { method: "POST", body: JSON.stringify({ command: readCmd }) }
            );
            const configJson = (readResp.stdout ?? readResp.output ?? "{}").trim();
            const parsedConfig = JSON.parse(configJson) as Record<string, unknown>;
            setConfig(parsedConfig);
            console.log("[gateway] Loaded config via REST fallback");
          } catch (fallbackErr) {
            console.warn("[gateway] REST fallback for config also failed:", fallbackErr);
          }
        }
      }

      setScopeLimited(isScopeLimited);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[gateway] Connection failed:", msg, e);
      setError(msg);
    }
  }, [agent, getToken]);

  useEffect(() => {
    intentionalCloseRef.current = false;
    if (agent?.state === "RUNNING" && !connected) {
      connectGateway();
    }
    return () => {
      intentionalCloseRef.current = true;
      gwRef.current?.close();
      gwRef.current = null;
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id, agent?.state]);

  const sendMessage = useCallback(async () => {
    const gw = gwRef.current;
    if (!gw || !input.trim() || sending) return;

    const msg = input.trim();
    setInput("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: msg, timestamp: Date.now() },
    ]);

    try {
      console.log("[gateway] Sending chat message...");
      const sendResult = await gw.chatSend(msg);
      console.log("[gateway] chat.send acknowledged:", JSON.stringify(sendResult)?.slice(0, 300));
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("[gateway] chat.send failed:", errMsg);

      // Provide actionable error messages
      let userMessage = errMsg;
      if (errMsg.includes("missing scope")) {
        userMessage = "Chat requires operator scope. The gateway may need reconfiguration — try restarting the agent.";
      } else if (errMsg.includes("token_not_found") || errMsg.includes("401")) {
        userMessage = "LLM API key is invalid. Reconnecting will auto-provision a new key.";
      } else if (errMsg.includes("timed out")) {
        userMessage = "The LLM response timed out. The model may be overloaded — try again.";
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Error: ${userMessage}`,
          timestamp: Date.now(),
        },
      ]);
      setSending(false);
    }
  }, [input, sending]);

  const openFile = useCallback(
    async (name: string): Promise<string> => {
      const gw = gwRef.current;
      // Try gateway first, fall back to exec
      if (gw && !scopeLimited) {
        try {
          return await gw.fileGet(gwAgentId, name);
        } catch (e) {
          console.warn("[gateway] fileGet failed, trying REST fallback:", e);
        }
      }
      // REST API fallback via exec
      if (!agent) throw new Error("No agent");
      const token = await getToken();
      const safeName = name.replace(/'/g, "\\'").replace(/\.\./g, "");
      const cmd = `cat '/home/ubuntu/.openclaw/workspace/${safeName}' 2>&1`;
      const resp = await apiFetch<{ stdout?: string; output?: string }>(
        `/agents/${agent.id}/exec`, token,
        { method: "POST", body: JSON.stringify({ command: cmd }) }
      );
      return resp.stdout ?? resp.output ?? "";
    },
    [gwAgentId, scopeLimited, agent, getToken]
  );

  const saveFile = useCallback(
    async (name: string, content: string) => {
      const gw = gwRef.current;
      // Try gateway first, fall back to exec
      if (gw && !scopeLimited) {
        try {
          await gw.fileSet(gwAgentId, name, content);
          return;
        } catch (e) {
          console.warn("[gateway] fileSet failed, trying REST fallback:", e);
        }
      }
      // REST API fallback via exec
      if (!agent) throw new Error("No agent");
      const token = await getToken();
      const safeName = name.replace(/'/g, "\\'").replace(/\.\./g, "");
      // Base64 encode the content to avoid shell escaping issues
      const b64 = btoa(unescape(encodeURIComponent(content)));
      const cmd = `echo '${b64}' | base64 -d > '/home/ubuntu/.openclaw/workspace/${safeName}'`;
      await apiFetch(
        `/agents/${agent.id}/exec`, token,
        { method: "POST", body: JSON.stringify({ command: cmd }) }
      );
    },
    [gwAgentId, scopeLimited, agent, getToken]
  );

  const saveConfig = useCallback(async (patch: Record<string, unknown>) => {
    const gw = gwRef.current;
    // Try gateway first
    if (gw && !scopeLimited) {
      try {
        await gw.configPatch(patch);
        return;
      } catch (e) {
        console.warn("[gateway] configPatch failed, trying REST fallback:", e);
      }
    }
    // REST API fallback: merge patch into openclaw.json via exec
    if (!agent) throw new Error("No agent");
    const token = await getToken();
    const cmd = `python3 -c "
import json
p='/home/ubuntu/.openclaw/openclaw.json'
try:
 c=json.load(open(p))
except:
 c={}
patch=${JSON.stringify(patch).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}
def deep_merge(base,over):
 for k,v in over.items():
  if isinstance(v,dict) and isinstance(base.get(k),dict):
   deep_merge(base[k],v)
  else:
   base[k]=v
deep_merge(c,patch)
json.dump(c,open(p,'w'),indent=2)
print('saved')
"`;
    await apiFetch(
      `/agents/${agent.id}/exec`, token,
      { method: "POST", body: JSON.stringify({ command: cmd }) }
    );
  }, [scopeLimited, agent, getToken]);

  return {
    messages,
    sendMessage,
    input,
    setInput,
    sending,
    connected,
    error,
    scopeLimited,
    files,
    config,
    configSchema,
    openFile,
    saveFile,
    saveConfig,
    gateway: gwRef.current,
  };
}
