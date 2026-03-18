"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { apiFetch } from "@/lib/api";
import "@xterm/xterm/css/xterm.css";

interface TerminalPanelProps {
  agentId: string;
  getToken: () => Promise<string>;
}

export function TerminalPanel({ agentId, getToken }: TerminalPanelProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected") return;
    setStatus("connecting");
    setErrorMsg(null);

    try {
      const token = await getToken();

      // Get shell token from backend
      const shellData = await apiFetch<{
        jwt: string;
        shell?: string;
        ws_url?: string;
      }>(`/agents/${agentId}/shell/token`, token, {
        method: "POST",
        body: JSON.stringify({ shell: "/bin/bash" }),
      });

      // Build WebSocket URL
      const wsBase = shellData.ws_url || "wss://api.hypercli.com/ws";
      const wsUrl = `${wsBase}/shell/${agentId}?jwt=${encodeURIComponent(shellData.jwt)}&shell=${encodeURIComponent(shellData.shell || "/bin/bash")}`;

      // Initialize xterm
      if (!xtermRef.current && termRef.current) {
        const term = new XTerm({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: "'Space Mono', 'Fira Code', 'Courier New', monospace",
          theme: {
            background: "#0a0a14",
            foreground: "#e0e0e0",
            cursor: "#39ff14",
            cursorAccent: "#0a0a14",
            selectionBackground: "rgba(57, 255, 20, 0.25)",
            black: "#0a0a14",
            red: "#d05f5f",
            green: "#39ff14",
            yellow: "#f0c56c",
            blue: "#6C63FF",
            magenta: "#7c3aed",
            cyan: "#00d4ff",
            white: "#e0e0e0",
            brightBlack: "#555555",
            brightRed: "#ff6b6b",
            brightGreen: "#39ff14",
            brightYellow: "#f5d76e",
            brightBlue: "#818cf8",
            brightMagenta: "#a78bfa",
            brightCyan: "#22d3ee",
            brightWhite: "#ffffff",
          },
          allowProposedApi: true,
        });

        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(termRef.current);
        fit.fit();

        xtermRef.current = term;
        fitRef.current = fit;
      }

      const term = xtermRef.current!;
      const fit = fitRef.current!;

      // Connect WebSocket
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        term.focus();
        // Send initial resize
        const { cols, rows } = term;
        ws.send(`\x1b[8;${rows};${cols}t`);
      };

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          term.write(event.data);
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setErrorMsg("WebSocket connection failed");
      };

      ws.onclose = (event) => {
        setStatus("idle");
        if (event.code !== 1000) {
          term.writeln("\r\n\x1b[31m[Connection closed]\x1b[0m");
        }
      };

      // Pipe terminal input to WebSocket
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // Handle resize
      term.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`\x1b[8;${rows};${cols}t`);
        }
      });

      // Window resize → fit terminal
      const handleResize = () => {
        fit.fit();
      };
      window.addEventListener("resize", handleResize);

      // Cleanup function stored for later
      const cleanup = () => {
        window.removeEventListener("resize", handleResize);
      };
      return cleanup;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[terminal] Connection failed:", msg);

      // If /bin/bash fails, try /bin/sh
      if (msg.includes("404") || msg.includes("not found") || msg.includes("bash")) {
        try {
          setErrorMsg("bash not found, trying sh...");
          const token = await getToken();
          const shellData = await apiFetch<{
            jwt: string;
            shell?: string;
            ws_url?: string;
          }>(`/agents/${agentId}/shell/token`, token, {
            method: "POST",
            body: JSON.stringify({ shell: "/bin/sh" }),
          });
          const wsBase = shellData.ws_url || "wss://api.hypercli.com/ws";
          const wsUrl = `${wsBase}/shell/${agentId}?jwt=${encodeURIComponent(shellData.jwt)}&shell=${encodeURIComponent(shellData.shell || "/bin/sh")}`;

          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;
          const term = xtermRef.current!;

          ws.onopen = () => {
            setStatus("connected");
            setErrorMsg(null);
            term.focus();
            const { cols, rows } = term;
            ws.send(`\x1b[8;${rows};${cols}t`);
          };
          ws.onmessage = (event) => {
            if (typeof event.data === "string") term.write(event.data);
          };
          ws.onerror = () => {
            setStatus("error");
            setErrorMsg("Shell connection failed");
          };
          ws.onclose = () => setStatus("idle");
          term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(data);
          });
          return;
        } catch {
          // Fall through to error
        }
      }

      setStatus("error");
      setErrorMsg(msg);
    }
  }, [agentId, getToken, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      xtermRef.current?.dispose();
      xtermRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // Re-fit on visibility
  useEffect(() => {
    const timer = setTimeout(() => {
      fitRef.current?.fit();
    }, 100);
    return () => clearTimeout(timer);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-low/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Terminal</span>
          <span
            className={`w-2 h-2 rounded-full ${
              status === "connected"
                ? "bg-[#38D39F]"
                : status === "connecting"
                ? "bg-[#f0c56c] animate-pulse"
                : status === "error"
                ? "bg-[#d05f5f]"
                : "bg-text-muted"
            }`}
          />
          {status === "connecting" && (
            <span className="text-xs text-text-muted">Connecting...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(status === "idle" || status === "error") && (
            <button
              onClick={connect}
              className="btn-primary px-3 py-1 rounded text-xs font-medium"
            >
              {status === "error" ? "Retry" : "Connect"}
            </button>
          )}
          {status === "connected" && (
            <button
              onClick={() => {
                wsRef.current?.close();
                setStatus("idle");
              }}
              className="btn-secondary px-3 py-1 rounded text-xs font-medium"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && status === "error" && (
        <div className="px-4 py-2 text-xs text-[#d05f5f] bg-[#d05f5f]/10 border-b border-[#d05f5f]/20">
          {errorMsg}
        </div>
      )}

      {/* Terminal area */}
      <div className="flex-1 relative">
        {status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a14]">
            <div className="text-center">
              <p className="text-text-secondary mb-3">
                Connect to the agent&apos;s shell
              </p>
              <button
                onClick={connect}
                className="btn-primary px-6 py-2 rounded-lg text-sm font-medium"
              >
                Open Terminal
              </button>
            </div>
          </div>
        )}
        <div
          ref={termRef}
          className="w-full h-full"
          style={{ display: status === "idle" ? "none" : "block" }}
        />
      </div>
    </div>
  );
}
