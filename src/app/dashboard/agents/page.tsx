"use client";

import { useState, useEffect } from "react";
import { Plus, Play, Square, Trash2 } from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";
import { apiFetch } from "@/lib/api";
import { agentAvatar } from "@/lib/avatar";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { AgentCardSkeleton } from "@/components/dashboard/Skeleton";

interface Agent {
  id: string;
  name: string;
  state: string;
  description?: string;
  hostname?: string | null;
  cpu?: number;
  memory?: number;
}

export default function AgentsPage() {
  const { getToken } = useTamashiiAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);

  const loadAgents = async () => {
    try {
      const token = await getToken();
      const data = await apiFetch<{ agents: Agent[] }>("/agents", token);
      setAgents(data.agents ?? []);
    } catch {
      // Agents not available
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAgent = async (id: string) => {
    try {
      const token = await getToken();
      await apiFetch(`/agents/${id}/start`, token, { method: "POST" });
      await loadAgents();
    } catch (err) {
      console.error("Failed to start agent:", err);
    }
  };

  const stopAgent = async (id: string) => {
    try {
      const token = await getToken();
      await apiFetch(`/agents/${id}/stop`, token, { method: "POST" });
      await loadAgents();
    } catch (err) {
      console.error("Failed to stop agent:", err);
    }
  };

  const deleteAgent = async () => {
    if (!deleteTarget) return;
    try {
      const token = await getToken();
      await apiFetch(`/agents/${deleteTarget.id}`, token, { method: "DELETE" });
      setDeleteTarget(null);
      await loadAgents();
    } catch (err) {
      console.error("Failed to delete agent:", err);
    }
  };

  const stateColor = (state: string) => {
    switch (state) {
      case "RUNNING": return "text-green-400";
      case "STARTING": case "PENDING": return "text-yellow-400";
      case "STOPPED": return "text-text-muted";
      default: return "text-text-muted";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Agents</h1>
        <button className="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          New Agent
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <AgentCardSkeleton key={i} />)}
        </div>
      ) : agents.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-text-muted text-sm mb-4">No agents yet. Create one to get started.</p>
          <button className="btn-primary px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Create Agent
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const avatar = agentAvatar(agent.name);
            const Icon = avatar.icon;
            const isRunning = agent.state === "RUNNING";

            return (
              <div key={agent.id} className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: avatar.bgColor }}
                  >
                    <Icon className="w-5 h-5" style={{ color: avatar.fgColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{agent.name}</h3>
                    <span className={`text-xs font-medium ${stateColor(agent.state)}`}>
                      {agent.state}
                    </span>
                  </div>
                </div>

                {agent.description && (
                  <p className="text-xs text-text-muted mb-3 line-clamp-2">{agent.description}</p>
                )}

                <div className="flex items-center gap-2">
                  {isRunning ? (
                    <button
                      onClick={() => stopAgent(agent.id)}
                      className="flex-1 btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <Square className="w-3 h-3" />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => startAgent(agent.id)}
                      className="flex-1 btn-primary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      Start
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(agent)}
                    className="p-1.5 text-text-muted hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Agent"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={deleteAgent}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
