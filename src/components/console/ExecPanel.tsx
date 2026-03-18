"use client";

import { useState, useRef } from "react";
import { Play, Loader2, Copy, Check } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ExecResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  command: string;
  timestamp: number;
}

interface ExecPanelProps {
  agentId: string;
  getToken: () => Promise<string>;
}

export function ExecPanel({ agentId, getToken }: ExecPanelProps) {
  const [command, setCommand] = useState("");
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<ExecResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runCommand = async () => {
    if (!command.trim() || running) return;
    const cmd = command.trim();
    setCommand("");
    setRunning(true);
    setError(null);

    try {
      const token = await getToken();
      const result = await apiFetch<{
        stdout?: string;
        stderr?: string;
        exit_code?: number;
        output?: string;
      }>(`/agents/${agentId}/exec`, token, {
        method: "POST",
        body: JSON.stringify({ command: cmd, timeout: 30000 }),
      });

      setHistory((prev) => [
        {
          stdout: result.stdout ?? result.output ?? "",
          stderr: result.stderr ?? "",
          exit_code: result.exit_code ?? 0,
          command: cmd,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setHistory((prev) => [
        {
          stdout: "",
          stderr: err instanceof Error ? err.message : String(err),
          exit_code: 1,
          command: cmd,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
    } finally {
      setRunning(false);
      inputRef.current?.focus();
    }
  };

  const copyOutput = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Command input */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <span className="text-lime font-mono text-sm font-bold">$</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runCommand()}
          placeholder="Enter command to execute..."
          disabled={running}
          className="flex-1 bg-transparent text-foreground text-sm font-mono placeholder:text-text-muted focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={runCommand}
          disabled={running || !command.trim()}
          className="btn-primary px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
        >
          {running ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          Run
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-[#d05f5f] bg-[#d05f5f]/10 border-b border-[#d05f5f]/20">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Run a command to see output here
          </div>
        )}
        {history.map((result, i) => (
          <div key={result.timestamp} className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-surface-low/50 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-lime font-mono text-xs">$</span>
                <code className="text-sm font-mono text-foreground">{result.command}</code>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                    result.exit_code === 0
                      ? "bg-[#38D39F]/10 text-[#38D39F]"
                      : "bg-[#d05f5f]/10 text-[#d05f5f]"
                  }`}
                >
                  exit {result.exit_code}
                </span>
                {(result.stdout || result.stderr) && (
                  <button
                    onClick={() => copyOutput(result.stdout || result.stderr, i)}
                    className="text-text-muted hover:text-foreground transition-colors"
                    title="Copy output"
                  >
                    {copied === i ? (
                      <Check className="w-3.5 h-3.5 text-[#38D39F]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
            {result.stdout && (
              <pre className="px-4 py-3 text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto max-h-60">
                {result.stdout}
              </pre>
            )}
            {result.stderr && (
              <pre className="px-4 py-3 text-xs font-mono text-[#d05f5f] whitespace-pre-wrap overflow-x-auto max-h-40 border-t border-border">
                {result.stderr}
              </pre>
            )}
            {!result.stdout && !result.stderr && (
              <div className="px-4 py-3 text-xs text-text-muted italic">
                No output
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
