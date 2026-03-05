"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench, Brain } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  toolCalls?: Array<{ name: string; args: string; result?: string }>;
  timestamp?: number;
}

export function ChatMessage({ role, content, thinking, toolCalls, timestamp }: ChatMessageProps) {
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const isUser = role === "user";
  const isSystem = role === "system";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 group`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : isSystem
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : "bg-surface-low text-foreground border border-border"
        }`}
      >
        {/* Thinking block */}
        {thinking && (
          <button
            onClick={() => setThinkingOpen(!thinkingOpen)}
            className="flex items-center gap-1.5 text-xs text-text-muted mb-2 hover:text-text-secondary transition-colors"
          >
            <Brain className="w-3.5 h-3.5" />
            Thinking
            {thinkingOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}
        {thinking && thinkingOpen && (
          <div className="text-xs text-text-muted bg-surface-high/50 rounded p-2 mb-2 whitespace-pre-wrap">
            {thinking}
          </div>
        )}

        {/* Content */}
        <div className="whitespace-pre-wrap break-words">{content}</div>

        {/* Tool calls */}
        {toolCalls && toolCalls.length > 0 && (
          <>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="flex items-center gap-1.5 text-xs text-text-muted mt-2 hover:text-text-secondary transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" />
              {toolCalls.length} tool call{toolCalls.length > 1 ? "s" : ""}
              {toolsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {toolsOpen && (
              <div className="mt-1 space-y-1">
                {toolCalls.map((tc, i) => (
                  <div key={i} className="text-xs bg-surface-high/50 rounded p-2">
                    <span className="text-primary font-mono">{tc.name}</span>
                    <pre className="text-text-muted mt-1 overflow-x-auto">{tc.args}</pre>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Timestamp */}
        {timestamp && (
          <div className="text-[10px] text-text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
