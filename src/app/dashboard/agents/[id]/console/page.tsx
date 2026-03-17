"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Send, ArrowLeft, Loader2 } from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";
import { apiFetch } from "@/lib/api";
import { useGatewayChat } from "@/hooks/useGatewayChat";
import { ChatMessage } from "@/components/dashboard/ChatMessage";

interface Agent {
  id: string;
  name: string;
  state: string;
  hostname: string | null;
  openclaw_url?: string | null;
}

export default function AgentConsolePage() {
  const params = useParams();
  const agentId = params.id as string;
  const { getToken } = useTamashiiAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll agent state until RUNNING so the WebSocket can connect
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const load = async () => {
      try {
        const token = await getToken();
        const data = await apiFetch<Agent>(`/agents/${agentId}`, token);
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
  } = useGatewayChat(agent, getToken);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <a href="/dashboard/agents" className="text-text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
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
            {error && <span className="text-destructive">{error}</span>}
          </div>
        </div>
      </div>

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
    </div>
  );
}
