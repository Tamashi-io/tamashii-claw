"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, Key, Zap, BarChart3, Plus, Play, Square,
  Terminal, Monitor, CreditCard, ArrowRight,
  Clock, Gauge,
} from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";
import { apiFetch } from "@/lib/api";
import { formatTokens } from "@/lib/format";
import { agentAvatar } from "@/lib/avatar";
import { UsageChart } from "@/components/dashboard/UsageChart";
import { KeyUsageTable } from "@/components/dashboard/KeyUsageTable";
import { OnboardingGuide } from "@/components/dashboard/OnboardingGuide";
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/dashboard/Skeleton";

interface Agent {
  id: string;
  name: string;
  state: string;
  hostname?: string | null;
  cpu_millicores?: number;
  cpu?: number;
  memory_mib?: number;
  memory?: number;
}

interface PlanInfo {
  id?: string;
  plan_id?: string;
  name?: string;
  price?: number;
  aiu?: number;
  provider?: string;
  features?: string[];
  expires_at?: string | null;
  seconds_remaining?: number;
  limits?: {
    tpd: number;
    tpm: number;
    burst_tpm: number;
    rpm: number;
  };
  [k: string]: unknown;
}

interface BudgetInfo {
  max_agents: number;
  total_cpu: number;
  total_memory: number;
  used_agents: number;
  used_cpu: number;
  used_memory: number;
}

interface DashboardData {
  agents: Agent[];
  keys: Array<{ id?: string; key_id?: string; name?: string; tokens?: number; requests?: number; [k: string]: unknown }>;
  stats: {
    total_tokens: number;
    total_requests: number;
    active_keys: number;
    rate_limit_tpm: number;
    rate_limit_rpm: number;
    current_tpm?: number;
    current_rpm?: number;
  };
  usage: Array<{ date: string; prompt_tokens: number; completion_tokens: number; total_tokens?: number; requests?: number }>;
  key_usage: Array<{ key_id: string; name: string; tokens: number; requests: number }>;
  plan: PlanInfo | null;
  budget: BudgetInfo | null;
}

function stateColor(state: string) {
  switch (state) {
    case "RUNNING": return "text-green-400";
    case "STARTING": case "PENDING": return "text-yellow-400";
    case "FAILED": case "ERROR": return "text-destructive";
    default: return "text-text-muted";
  }
}

function stateDot(state: string) {
  switch (state) {
    case "RUNNING": return "bg-green-400";
    case "STARTING": case "PENDING": return "bg-yellow-400";
    case "FAILED": case "ERROR": return "bg-red-400";
    default: return "bg-text-muted";
  }
}

export default function DashboardPage() {
  const { getToken, user } = useTamashiiAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const token = await getToken();
      const dashboard = await apiFetch<DashboardData>("/dashboard", token);
      console.log("[dashboard] data:", JSON.stringify({
        stats: dashboard.stats,
        plan: dashboard.plan ? { name: dashboard.plan.name, id: dashboard.plan.id } : null,
        agents: dashboard.agents?.length ?? 0,
        usage: dashboard.usage?.length ?? 0,
        key_usage: dashboard.key_usage?.length ?? 0,
      }));
      setData(dashboard);
    } catch (err) {
      console.error("[dashboard] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const startAgent = async (id: string) => {
    try {
      const token = await getToken();
      await apiFetch(`/agents/${id}/start`, token, { method: "POST" });
      loadDashboard();
    } catch (err) {
      console.error("Failed to start:", err);
    }
  };

  const stopAgent = async (id: string) => {
    try {
      const token = await getToken();
      await apiFetch(`/agents/${id}/stop`, token, { method: "POST" });
      loadDashboard();
    } catch (err) {
      console.error("Failed to stop:", err);
    }
  };

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
  const plan = data?.plan;
  const budget = data?.budget;
  const agents = data?.agents ?? [];
  const planName = plan?.name ?? plan?.plan_id ?? plan?.id ?? null;

  // Plan expiry
  let expiresLabel: string | null = null;
  if (plan?.expires_at) {
    const exp = new Date(plan.expires_at);
    const now = new Date();
    const days = Math.ceil((exp.getTime() - now.getTime()) / 86_400_000);
    if (days > 0) {
      expiresLabel = `${days} day${days === 1 ? "" : "s"} left`;
    } else {
      expiresLabel = "Expired";
    }
  }

  // Greeting
  const displayName = user?.email?.split("@")[0] ?? null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {displayName ? `Welcome back, ${displayName}` : "Dashboard"}
          </h1>
          {planName && (
            <p className="text-sm text-text-secondary mt-0.5">
              <span className="capitalize">{planName}</span> plan
              {expiresLabel && (
                <span className="text-text-muted ml-2">
                  <Clock className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                  {expiresLabel}
                </span>
              )}
            </p>
          )}
        </div>
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
            Tokens (30d)
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
            <Gauge className="w-4 h-4" />
            Rate Limit
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats?.rate_limit_tpm ? `${formatTokens(stats.rate_limit_tpm)} TPM` : "—"}
          </div>
        </div>
      </div>

      {/* Active Agents */}
      {agents.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Agents</h2>
            {budget && (
              <span className="text-xs text-text-muted">
                {budget.used_agents}/{budget.max_agents} agents &middot;{" "}
                {budget.used_cpu}/{budget.total_cpu} CPU &middot;{" "}
                {budget.used_memory}/{budget.total_memory} GB
              </span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent) => {
              const avatar = agentAvatar(agent.name);
              const Icon = avatar.icon;
              const isRunning = agent.state === "RUNNING";
              const cpuVal = agent.cpu ?? agent.cpu_millicores;
              const memVal = agent.memory ?? agent.memory_mib;

              return (
                <div key={agent.id} className="glass-card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: avatar.bgColor }}
                    >
                      <Icon className="w-5 h-5" style={{ color: avatar.fgColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{agent.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${stateDot(agent.state)}`} />
                        <span className={`text-xs font-medium ${stateColor(agent.state)}`}>
                          {agent.state}
                        </span>
                        {cpuVal != null && memVal != null && (
                          <span className="text-xs text-text-muted ml-1">
                            {cpuVal} CPU &middot; {memVal} GB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRunning && (
                      <>
                        <button
                          onClick={() => router.push(`/dashboard/agents/${agent.id}/console`)}
                          className="flex-1 btn-primary px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                        >
                          <Terminal className="w-3 h-3" /> Console
                        </button>
                        {agent.hostname && (
                          <a
                            href={`https://desktop-${agent.hostname}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 btn-secondary px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                          >
                            <Monitor className="w-3 h-3" /> Desktop
                          </a>
                        )}
                        <button
                          onClick={() => stopAgent(agent.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium btn-secondary flex items-center gap-1"
                        >
                          <Square className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    {!isRunning && agent.state !== "STARTING" && agent.state !== "PENDING" && (
                      <button
                        onClick={() => startAgent(agent.id)}
                        className="flex-1 btn-primary px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                      >
                        <Play className="w-3 h-3" /> Start
                      </button>
                    )}
                    {(agent.state === "STARTING" || agent.state === "PENDING") && (
                      <span className="text-xs text-yellow-400 px-2.5 py-1.5">Starting...</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <UsageChart data={data?.usage ?? []} />
        <KeyUsageTable data={data?.key_usage ?? []} />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => router.push("/dashboard/agents")}
          className="glass-card p-4 text-left hover:border-border-medium transition-colors group"
        >
          <Bot className="w-5 h-5 text-text-secondary mb-2" />
          <p className="text-sm font-medium text-foreground">Manage Agents</p>
          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
            Create, start, stop <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </button>
        <button
          onClick={() => router.push("/dashboard/keys")}
          className="glass-card p-4 text-left hover:border-border-medium transition-colors group"
        >
          <Key className="w-5 h-5 text-text-secondary mb-2" />
          <p className="text-sm font-medium text-foreground">API Keys</p>
          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
            Create &amp; manage <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </button>
        <button
          onClick={() => router.push("/dashboard/plans")}
          className="glass-card p-4 text-left hover:border-border-medium transition-colors group"
        >
          <CreditCard className="w-5 h-5 text-text-secondary mb-2" />
          <p className="text-sm font-medium text-foreground">Plans</p>
          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
            View &amp; upgrade <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </button>
        <button
          onClick={() => router.push("/dashboard/billing")}
          className="glass-card p-4 text-left hover:border-border-medium transition-colors group"
        >
          <BarChart3 className="w-5 h-5 text-text-secondary mb-2" />
          <p className="text-sm font-medium text-foreground">Billing</p>
          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
            Receipts &amp; profile <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </button>
      </div>
    </div>
  );
}
