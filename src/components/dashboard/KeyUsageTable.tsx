"use client";

import { formatTokens } from "@/lib/format";

interface KeyUsage {
  key_id: string;
  name: string;
  tokens: number;
  requests: number;
}

interface KeyUsageTableProps {
  data: KeyUsage[];
}

export function KeyUsageTable({ data }: KeyUsageTableProps) {
  if (data.length === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Key Usage</h3>
        <div className="h-24 flex items-center justify-center text-text-muted text-sm">
          No API key usage yet
        </div>
      </div>
    );
  }

  const maxTokens = Math.max(...data.map((k) => k.tokens), 1);

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Key Usage</h3>
      <div className="space-y-3">
        {data.map((key) => (
          <div key={key.key_id}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-text-secondary font-mono text-xs truncate max-w-[160px]">
                {key.name || key.key_id}
              </span>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span>{formatTokens(key.tokens)} tokens</span>
                <span>{key.requests} reqs</span>
              </div>
            </div>
            <div className="h-2 bg-surface-low rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(key.tokens / maxTokens) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
