"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GatewayClient } from "@/gateway-client";
import { apiFetch } from "@/lib/api";

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
    if (!agent || agent.state !== "RUNNING" || !agent.hostname) return;

    const url = agent.openclaw_url || `wss://openclaw-${agent.hostname}`;
    if (!url) {
      setError("No gateway URL available");
      return;
    }

    try {
      const authToken = await getToken();
      const tokenResp = await apiFetch<{ token: string }>(
        `/agents/${agent.id}/token`,
        authToken
      );

      const cookieDomain = "";
      const subdomain = agent.hostname.split(".")[0];
      const tokenValue = encodeURIComponent(tokenResp.token);
      const securePart = window.location.protocol === "https:" ? "; secure" : "";
      const domainPart = cookieDomain ? `; domain=${cookieDomain}` : "";
      const expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toUTCString();

      const cookieNames = [
        `${subdomain}-token`,
        `shell-${subdomain}-token`,
        `openclaw-${subdomain}-token`,
        "reef_token",
      ];
      for (const name of cookieNames) {
        document.cookie = `${name}=${tokenValue}; expires=${expires}; path=/${domainPart}${securePart}; samesite=lax`;
      }

      const gw = new GatewayClient({ url, gatewayToken: tokenResp.token });

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
      setError(e instanceof Error ? e.message : String(e));
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
  };
}
