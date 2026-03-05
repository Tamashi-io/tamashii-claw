"use client";

import { formatTokens } from "@/lib/format";

interface DayUsage {
  date: string;
  prompt_tokens: number;
  completion_tokens: number;
}

interface UsageChartProps {
  data: DayUsage[];
}

export function UsageChart({ data }: UsageChartProps) {
  if (data.length === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Token Usage (7 days)</h3>
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">
          No usage data yet
        </div>
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.prompt_tokens + d.completion_tokens), 1);

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Token Usage (7 days)</h3>
      <div className="flex items-end gap-2 h-48">
        {data.map((day) => {
          const total = day.prompt_tokens + day.completion_tokens;
          const heightPct = (total / maxTotal) * 100;
          const promptPct = total > 0 ? (day.prompt_tokens / total) * 100 : 0;
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-t-sm overflow-hidden"
                style={{ height: `${heightPct}%`, minHeight: total > 0 ? 4 : 0 }}
              >
                <div
                  className="w-full bg-primary/60"
                  style={{ height: `${promptPct}%` }}
                />
                <div
                  className="w-full bg-primary"
                  style={{ height: `${100 - promptPct}%` }}
                />
              </div>
              <span className="text-[10px] text-text-muted">
                {day.date.slice(5)}
              </span>
              {/* Tooltip */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 hidden group-hover:block glass-card p-2 text-xs whitespace-nowrap z-10">
                <div className="text-foreground font-medium">{formatTokens(total)} tokens</div>
                <div className="text-text-muted">
                  {formatTokens(day.prompt_tokens)} prompt / {formatTokens(day.completion_tokens)} completion
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-primary/60" />
          Prompt
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          Completion
        </div>
      </div>
    </div>
  );
}
