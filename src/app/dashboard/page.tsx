"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot, Key, Zap, BarChart3, Plus } from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";
import { apiFetch } from "@/lib/api";
import { formatTokens } from "@/lib/format";
import { UsageChart } from "@/components/dashboard/UsageChart";
import { KeyUsageTable } from "@/components/dashboard/KeyUsageTable";
import { OnboardingGuide } from "@/components/dashboard/OnboardingGuide";
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/dashboard/Skeleton";

interface DashboardData {
  agents: Array<{ id: string; name: string; state: string }>;
  keys: Array<{ id: string; name: string }>;
  stats: {
    total_tokens: number;
    total_requests: number;
    active_keys: number;
    rate_limit_tpm: number;
    rate_limit_rpm: number;
  };
  usage: Array<{ date: string; prompt_tokens: number; completion_tokens: number }>;
  key_usage: Array<{ key_id: string; name: string; tokens: number; requests: number }>;
}

export default function DashboardPage() {
  const { getToken } = useTamashiiAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const dashboard = await apiFetch<DashboardData>("/dashboard", token);
        setData(dashboard);
      } catch {
        // Dashboard data not available yet
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getToken]);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <TableSkeleton />
        </div>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard/keys")}
            className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Key
          </button>
          <button
            onClick={() => router.push("/dashboard/agents")}
            className="btn-primary px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
          >
            <Bot className="w-4 h-4" />
            New Agent
          </button>
        </div>
      </div>

      <OnboardingGuide />

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 mt-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
            <Zap className="w-4 h-4" />
            Total Tokens
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats ? formatTokens(stats.total_tokens) : "0"}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
            <BarChart3 className="w-4 h-4" />
            Requests
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats ? formatTokens(stats.total_requests) : "0"}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
            <Key className="w-4 h-4" />
            Active Keys
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats?.active_keys ?? 0}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
            <Bot className="w-4 h-4" />
            Agents
          </div>
          <div className="text-2xl font-bold text-foreground">
            {data?.agents?.length ?? 0}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <UsageChart data={data?.usage ?? []} />
        <KeyUsageTable data={data?.key_usage ?? []} />
      </div>
    </div>
  );
}
