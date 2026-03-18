"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Trash2, Download, Pause, Play } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface LogsPanelProps {
  agentId: string;
  getToken: () => Promise<string>;
}

export function LogsPanel({ agentId, getToken }: LogsPanelProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "connecting" | "streaming" | "paused" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "streaming") return;
    setStatus("connecting");
    setErrorMsg(null);

    try {
      const token = await getToken();
      const logsData = await apiFetch<{
        jwt: string;
        ws_url?: string;
      }>(`/agents/${agentId}/logs/token`, token, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const wsBase = logsData.ws_url || "wss://api.hypercli.com/ws";
      const wsUrl = `${wsBase}/logs/${agentId}?jwt=${encodeURIComponent(logsData.jwt)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("streaming");
      };

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          const newLines = event.data.split("\n").filter((l: string) => l.length > 0);
          if (newLines.length > 0) {
            setLines((prev) => {
              const combined = [...prev, ...newLines];
              // Keep last 2000 lines to prevent memory issues
              return combined.length > 2000 ? combined.slice(-2000) : combined;
            });
          }
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setErrorMsg("Log stream connection failed");
      };

      ws.onclose = () => {
        if (status !== "paused") setStatus("idle");
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[logs] Connection failed:", msg);
      setStatus("error");
      setErrorMsg(msg);
    }
  }, [agentId, getToken, status]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("idle");
  }, []);

  const pause = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("paused");
  }, []);

  const clearLogs = () => setLines([]);

  const downloadLogs = () => {
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-${agentId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  // Handle scroll — disable auto-scroll when user scrolls up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-low/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Logs</span>
          <span
            className={`w-2 h-2 rounded-full ${
              status === "streaming"
                ? "bg-[#38D39F] animate-pulse"
                : status === "connecting"
                ? "bg-[#f0c56c] animate-pulse"
                : status === "paused"
                ? "bg-[#f0c56c]"
                : status === "error"
                ? "bg-[#d05f5f]"
                : "bg-text-muted"
            }`}
          />
          <span className="text-xs text-text-muted">
            {status === "streaming" && `${lines.length} lines`}
            {status === "connecting" && "Connecting..."}
            {status === "paused" && "Paused"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {lines.length > 0 && (
            <>
              <button
                onClick={downloadLogs}
                className="p-1.5 rounded text-text-muted hover:text-foreground hover:bg-surface-low transition-colors"
                title="Download logs"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={clearLogs}
                className="p-1.5 rounded text-text-muted hover:text-foreground hover:bg-surface-low transition-colors"
                title="Clear logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {status === "streaming" && (
            <button
              onClick={pause}
              className="btn-secondary px-3 py-1 rounded text-xs font-medium flex items-center gap-1"
            >
              <Pause className="w-3 h-3" /> Pause
            </button>
          )}
          {(status === "idle" || status === "error" || status === "paused") && (
            <button
              onClick={connect}
              className="btn-primary px-3 py-1 rounded text-xs font-medium flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              {status === "paused" ? "Resume" : status === "error" ? "Retry" : "Stream"}
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="px-4 py-2 text-xs text-[#d05f5f] bg-[#d05f5f]/10 border-b border-[#d05f5f]/20">
          {errorMsg}
        </div>
      )}

      {/* Log output */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-[#0a0a14] p-4 font-mono text-xs leading-5"
      >
        {status === "idle" && lines.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-muted">
            <div className="text-center">
              <p className="mb-3">Stream live agent logs</p>
              <button
                onClick={connect}
                className="btn-primary px-6 py-2 rounded-lg text-sm font-medium"
              >
                Start Streaming
              </button>
            </div>
          </div>
        )}
        {status === "connecting" && lines.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Connecting to log stream...
          </div>
        )}
        {lines.map((line, i) => (
          <div key={i} className="text-[#e0e0e0] whitespace-pre-wrap break-all hover:bg-white/5">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
