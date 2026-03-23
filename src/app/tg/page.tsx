"use client";

import { useCallback, useEffect, useState } from "react";
import { useTelegramAuth } from "@/components/TelegramAuthProvider";
import { apiFetch } from "@/lib/api";
import { Bot, Zap, Key, ArrowRight } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  agents: { id: string; name: string; state: string }[];
  stats: {
    total_tokens: number;
    total_requests: number;
    active_keys: number;
  };
  plan: { name: string; id: string } | null;
}

export default function TgHomePage() {
  const { user, getToken } = useTelegramAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await apiFetch<any>("/dashboard", token);
      setData({
        agents: res.agents ?? [],
        stats: {
          total_tokens: res.stats?.total_tokens ?? 0,
          total_requests: res.stats?.total_requests ?? 0,
          active_keys: res.stats?.active_keys ?? 0,
        },
        plan: res.plan ?? null,
      });
    } catch (err) {
      console.error("[tg] Dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold">
          Hey{user?.firstName ? `, ${user.firstName}` : ""} 👋
        </h1>
        <p className="text-gray-400 text-sm">
          {data?.plan ? `Plan: ${data.plan.name}` : "No active plan"}
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/5 rounded-xl p-3 animate-pulse h-16" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            icon={<Zap className="w-4 h-4 text-yellow-400" />}
            label="Tokens"
            value={formatNumber(data?.stats.total_tokens ?? 0)}
          />
          <StatCard
            icon={<Bot className="w-4 h-4 text-cyan-400" />}
            label="Requests"
            value={formatNumber(data?.stats.total_requests ?? 0)}
          />
          <StatCard
            icon={<Key className="w-4 h-4 text-green-400" />}
            label="Keys"
            value={String(data?.stats.active_keys ?? 0)}
          />
        </div>
      )}

      {/* Agents */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Agents</h2>
          <Link href="/tg/agents" className="text-cyan-400 text-xs flex items-center gap-1">
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : (data?.agents.length ?? 0) === 0 ? (
          <div className="bg-white/5 rounded-xl p-6 text-center">
            <Bot className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm mb-3">No agents yet</p>
            <Link
              href="/tg/agents"
              className="inline-block bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Create Agent
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {data!.agents.map((agent) => (
              <Link
                key={agent.id}
                href="/tg/agents"
                className="block bg-white/5 rounded-xl p-4 active:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bot className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      agent.state === "RUNNING"
                        ? "bg-green-500/20 text-green-400"
                        : agent.state === "STOPPED"
                          ? "bg-gray-500/20 text-gray-400"
                          : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {agent.state}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {!data?.plan && !loading && (
        <Link
          href="/tg/plans"
          className="block bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-xl p-4 text-center"
        >
          <p className="text-sm font-medium text-white mb-1">Get Started</p>
          <p className="text-xs text-gray-400">Subscribe to a plan to deploy agents</p>
        </Link>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-gray-400 uppercase">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
