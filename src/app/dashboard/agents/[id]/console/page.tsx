"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Send, ArrowLeft, Loader2, MessageSquare, FolderOpen, HardDrive,
  Settings, TerminalSquare, ScrollText, Zap, MessageCircle, Cpu,
} from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";
import { apiFetch } from "@/lib/api";
import { useGatewayChat } from "@/hooks/useGatewayChat";
import { ChatMessage } from "@/components/dashboard/ChatMessage";
import { WorkspacePanel } from "@/components/dashboard/WorkspacePanel";
import { ConfigPanel } from "@/components/dashboard/ConfigPanel";
import { S3FilesPanel } from "@/components/dashboard/S3FilesPanel";
import { TerminalPanel } from "@/components/console/TerminalPanel";
import { ExecPanel } from "@/components/console/ExecPanel";
import { LogsPanel } from "@/components/console/LogsPanel";
import { ChannelsPanel } from "@/components/console/ChannelsPanel";
import { ModelsPanel } from "@/components/console/ModelsPanel";

interface Agent {
  id: string;
  name: string;
  state: string;
  hostname: string | null;
  openclaw_url?: string | null;
  gatewayToken?: string | null;
}

type Tab = "chat" | "terminal" | "exec" | "logs" | "workspace" | "files" | "models" | "channels" | "config";

const TABS: { key: Tab; label: string; icon: typeof MessageSquare }[] = [
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "terminal", label: "Shell", icon: TerminalSquare },
  { key: "exec", label: "Exec", icon: Zap },
  { key: "logs", label: "Logs", icon: ScrollText },
  { key: "workspace", label: "Workspace", icon: FolderOpen },
  { key: "files", label: "Files", icon: HardDrive },
  { key: "models", label: "Models", icon: Cpu },
  { key: "channels", label: "Channels", icon: MessageCircle },
  { key: "config", label: "Config", icon: Settings },
];

export default function AgentConsolePage() {
  const params = useParams();
  const agentId = params.id as string;
  const { getToken } = useTamashiiAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll agent state until RUNNING so the WebSocket can connect
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const load = async () => {
      try {
        const token = await getToken();
        const data = await apiFetch<Agent>(`/agents/${agentId}`, token);
        console.log("[console] Agent data:", JSON.stringify(data, null, 2));
        if (!cancelled) {
          setAgent(data);
          // Keep polling while agent is starting up
          if (data.state === "PENDING" || data.state === "STARTING") {
            timer = setTimeout(load, 3000);
          }
        }
      } catch {
        // Agent not found
      }
    };
    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [agentId, getToken]);

  const {
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
    gateway,
  } = useGatewayChat(agent, getToken);

  useEffect(() => {
    if (tab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, tab]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <a href="/dashboard/agents" className="text-text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground">{agent?.name ?? "Agent Console"}</h1>
          <div className="flex items-center gap-2 text-xs">
            {agent?.state === "PENDING" || agent?.state === "STARTING" ? (
              <span className="text-yellow-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Agent {agent.state.toLowerCase()}…
              </span>
            ) : (
              <span className={connected ? "text-green-400" : "text-text-muted"}>
                {connected ? "Connected" : "Disconnected"}
              </span>
            )}
            {error && <span className="text-destructive truncate">{error}</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface-low rounded-lg p-0.5 border border-border">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "chat" && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto glass-card p-4 mb-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-muted text-sm gap-2">
                {agent?.state === "PENDING" || agent?.state === "STARTING" ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span>Waiting for agent to start…</span>
                  </>
                ) : connected ? (
                  "Send a message to start chatting"
                ) : (
                  "Connecting to agent..."
                )}
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <ChatMessage key={i} {...msg} />
                ))}
                {sending && (
                  <div className="flex justify-start mb-3">
                    <div className="bg-surface-low rounded-lg px-4 py-2.5 border border-border">
                      <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={connected ? "Type a message..." : "Waiting for connection..."}
              disabled={!connected || sending}
              className="flex-1 px-4 py-3 rounded-lg bg-input-background border border-border text-foreground text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!connected || sending || !input.trim()}
              className="btn-primary px-4 py-3 rounded-lg disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </>
      )}

      {tab === "terminal" && (
        <div className="flex-1 overflow-hidden glass-card">
          <TerminalPanel agentId={agentId} getToken={getToken} />
        </div>
      )}

      {tab === "exec" && (
        <div className="flex-1 overflow-hidden glass-card">
          <ExecPanel agentId={agentId} getToken={getToken} />
        </div>
      )}

      {tab === "logs" && (
        <div className="flex-1 overflow-hidden glass-card">
          <LogsPanel agentId={agentId} getToken={getToken} />
        </div>
      )}

      {tab === "workspace" && (
        <div className="flex-1 overflow-hidden glass-card">
          <WorkspacePanel
            files={files}
            connected={connected}
            openFile={openFile}
            saveFile={saveFile}
          />
        </div>
      )}

      {tab === "files" && (
        <div className="flex-1 overflow-hidden glass-card">
          <S3FilesPanel
            agentId={agentId}
            getToken={getToken}
            active={tab === "files"}
          />
        </div>
      )}

      {tab === "models" && (
        <div className="flex-1 overflow-hidden glass-card">
          <ModelsPanel gateway={gateway} connected={connected} />
        </div>
      )}

      {tab === "channels" && (
        <div className="flex-1 overflow-hidden glass-card">
          <ChannelsPanel gateway={gateway} connected={connected} />
        </div>
      )}

      {tab === "config" && (
        <div className="flex-1 overflow-hidden glass-card">
          <ConfigPanel
            config={config}
            configSchema={configSchema}
            connected={connected}
            saveConfig={saveConfig}
          />
        </div>
      )}
    </div>
  );
}
