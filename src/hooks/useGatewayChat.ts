"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GatewayClient } from "@/gateway-client";
import { apiFetch, API_BASE } from "@/lib/api";

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
  if (!message || typeof message !== "object") return null;
  const entry = message as Record<string, unknown>;
  const rawRole = typeof entry.role === "string" ? entry.role.toLowerCase() : "";
  const role: ChatMessage["role"] =
    rawRole === "user" || rawRole === "assistant" || rawRole === "system"
      ? rawRole
      : "assistant";
  const timestamp = typeof entry.timestamp === "number" ? entry.timestamp : Date.now();

  const extractContent = (): string => {
    if (typeof entry.text === "string") return maybeDecodeMojibake(entry.text);
    if (typeof entry.content === "string") return maybeDecodeMojibake(entry.content);
    if (!Array.isArray(entry.content)) return "";
    const parts = entry.content
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const part = item as Record<string, unknown>;
        if (part.type !== "text") return "";
        return typeof part.text === "string" ? part.text : "";
      })
      .filter(Boolean)
      .join("");
    return maybeDecodeMojibake(parts);
  };

  const content = extractContent();
  if (!content.trim()) return null;

  let thinking: string | undefined;
  if (Array.isArray(entry.content)) {
    const thinkingParts = entry.content
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const part = item as Record<string, unknown>;
        if (part.type !== "thinking") return "";
        return typeof part.thinking === "string" ? part.thinking : "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
    if (thinkingParts) {
      thinking = maybeDecodeMojibake(thinkingParts);
    }
  }

  return {
    role,
    content,
    ...(thinking ? { thinking } : {}),
    timestamp,
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
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [configSchema, setConfigSchema] = useState<Record<string, unknown> | null>(null);
  const [gwAgentId, setGwAgentId] = useState("main");

  const connectGateway = useCallback(async () => {
    if (!agent || agent.state !== "RUNNING") return;

    // Resolve gateway URL:
    // Per HyperClaw routing: root hostname IS the gateway (wss://{name}.hypercli.com)
    // Desktop is at https://desktop-{name}.hypercli.com
    // openclaw_url may also point directly to the gateway
    // Fall back to backend WebSocket proxy if no hostname available
    const hostname = agent.hostname;
    const ocUrl = agent.openclaw_url;

    let gwBase: string | null = null;
    let useProxy = false;

    if (ocUrl) {
      // Use openclaw_url directly if provided
      gwBase = ocUrl.startsWith("wss://") || ocUrl.startsWith("ws://") ? ocUrl : `wss://${ocUrl}`;
    } else if (hostname) {
      // Root hostname is the gateway
      gwBase = `wss://${hostname}`;
    }

    if (!gwBase && !hostname) return;

    try {
      const authToken = await getToken();

      let url: string;
      if (gwBase) {
        // Try direct connection with HyperClaw JWT
        let hyperclawJwt: string | undefined;
        try {
          const tokenResp = await apiFetch<{ token?: string; jwt_token?: string }>(
            `/agents/${agent.id}/token`,
            authToken
          );
          hyperclawJwt = tokenResp.token ?? tokenResp.jwt_token ?? undefined;
        } catch {
          // Fall back to connecting without JWT
        }

        url = hyperclawJwt
          ? `${gwBase}?token=${encodeURIComponent(hyperclawJwt)}`
          : gwBase;
      } else {
        // No gateway URL available — use backend proxy
        useProxy = true;
        const wsBase = API_BASE.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
        url = `${wsBase}/ws/agents/${agent.id}/gateway?token=${encodeURIComponent(authToken)}`;
      }

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

      console.log("[gateway] Connecting:", { url: url.split("?")[0], mode: useProxy ? "proxy" : "direct", hasGatewayToken: !!gatewayToken });

      const gw = new GatewayClient({ url, gatewayToken });

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
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { ...last, thinking: (last.thinking ?? "") + ((payload.text as string) ?? "") },
              ];
            }
            return [
              ...prev,
              { role: "assistant", content: "", thinking: (payload.text as string) ?? "", timestamp: Date.now() },
            ];
          });
        } else if (event === "chat.tool_call") {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              const tc = {
                name: (payload as Record<string, unknown>).name as string ?? "?",
                args: JSON.stringify(payload),
              };
              return [
                ...prev.slice(0, -1),
                { ...last, toolCalls: [...(last.toolCalls ?? []), tc] },
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

      await gw.connect();
      gwRef.current = gw;
      setConnected(true);
      setError(null);

      const history = await gw.chatHistory("main", 200);
      const hydrated = history
        .map((message) => normalizeHistoryMessage(message))
        .filter((message): message is ChatMessage => message !== null);
      setMessages(hydrated.length > 0 ? hydrated : []);

      const agents = await gw.agentsList();
      if (agents.length > 0) {
        setGwAgentId(agents[0].id);
      }

      const agentIdForFiles = agents.length > 0 ? agents[0].id : "main";
      const filesList = await gw.filesList(agentIdForFiles);
      setFiles(filesList);

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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[gateway] Connection failed:", msg, e);
      setError(msg);
    }
  }, [agent, getToken]);

  useEffect(() => {
    if (agent?.state === "RUNNING" && !connected) {
      connectGateway();
    }
    return () => {
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
      await gw.chatSend(msg);
    } catch (e: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Error: ${e instanceof Error ? e.message : String(e)}`,
          timestamp: Date.now(),
        },
      ]);
      setSending(false);
    }
  }, [input, sending]);

  const openFile = useCallback(
    async (name: string): Promise<string> => {
      const gw = gwRef.current;
      if (!gw) throw new Error("Not connected");
      return gw.fileGet(gwAgentId, name);
    },
    [gwAgentId]
  );

  const saveFile = useCallback(
    async (name: string, content: string) => {
      const gw = gwRef.current;
      if (!gw) throw new Error("Not connected");
      await gw.fileSet(gwAgentId, name, content);
    },
    [gwAgentId]
  );

  const saveConfig = useCallback(async (patch: Record<string, unknown>) => {
    const gw = gwRef.current;
    if (!gw) throw new Error("Not connected");
    await gw.configPatch(patch);
  }, []);

  return {
    messages,
    sendMessage,
    input,
    setInput,
    sending,
    connected,
    error,
    files,
    config,
    configSchema,
    openFile,
    saveFile,
    saveConfig,
    gateway: gwRef.current,
  };
}
