"use client";

import { useState, useEffect } from "react";
import { Plus, Play, Square, Trash2, X, Cpu, HardDrive } from "lucide-react";
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
  cpu_millicores?: number;
  memory_mib?: number;
}

interface AgentBudget {
  max_agents: number;
  total_cpu: number;
  total_memory: number;
  used_agents: number;
  used_cpu: number;
  used_memory: number;
}

const SIZE_PRESETS = [
  { label: "Small", cpu: 250, memory: 256 },
  { label: "Medium", cpu: 500, memory: 512 },
  { label: "Large", cpu: 1000, memory: 1024 },
];

export default function AgentsPage() {
  const { getToken } = useTamashiiAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [budget, setBudget] = useState<AgentBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [preset, setPreset] = useState(1); // default Medium

  const loadAgents = async () => {
    try {
      const token = await getToken();
      const data = await apiFetch<{ items: Agent[]; budget?: AgentBudget }>("/agents", token);
      setAgents(data.items ?? []);
      if (data.budget) setBudget(data.budget);
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

  const createAgent = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      const { cpu, memory } = SIZE_PRESETS[preset];
      await apiFetch("/agents", token, {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          cpu_millicores: cpu,
          memory_mib: memory,
          start: true,
        }),
      });
      setShowCreate(false);
      setNewName("");
      setPreset(1);
      await loadAgents();
    } catch (err) {
      console.error("Failed to create agent:", err);
    } finally {
      setCreating(false);
    }
  };

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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agents</h1>
          {budget && (
            <p className="text-xs text-text-muted mt-1">
              {budget.used_agents}/{budget.max_agents} agents &middot;{" "}
              {budget.used_cpu}m/{budget.total_cpu}m CPU &middot;{" "}
              {budget.used_memory}Mi/{budget.total_memory}Mi memory
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Agent
        </button>
      </div>

      {/* Create Agent Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">Create Agent</h2>
              <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Agent Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="my-agent"
                  className="w-full px-3 py-2 rounded-lg bg-surface-low border border-border text-foreground text-sm placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {SIZE_PRESETS.map((p, i) => (
                    <button
                      key={p.label}
                      onClick={() => setPreset(i)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        preset === i
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-surface-low text-text-secondary hover:border-border-medium"
                      }`}
                    >
                      <div className="text-sm font-medium">{p.label}</div>
                      <div className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1">
                        <Cpu className="w-3 h-3" /> {p.cpu}m
                      </div>
                      <div className="text-xs text-text-muted flex items-center justify-center gap-1">
                        <HardDrive className="w-3 h-3" /> {p.memory}Mi
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 btn-secondary px-4 py-2 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createAgent}
                disabled={!newName.trim() || creating}
                className="flex-1 btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create & Start"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <AgentCardSkeleton key={i} />)}
        </div>
      ) : agents.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-text-muted text-sm mb-4">No agents yet. Create one to get started.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5"
          >
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

                {(agent.cpu_millicores || agent.memory_mib) && (
                  <p className="text-xs text-text-muted mb-3">
                    {agent.cpu_millicores}m CPU &middot; {agent.memory_mib}Mi memory
                  </p>
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
