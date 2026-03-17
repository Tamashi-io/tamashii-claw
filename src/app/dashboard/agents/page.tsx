"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Play, Square, Trash2, X, Cpu, HardDrive, Terminal } from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";
import { apiFetch } from "@/lib/api";
import { agentAvatar } from "@/lib/avatar";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { UpgradeRequiredModal } from "@/components/dashboard/UpgradeRequiredModal";
import { AgentCardSkeleton } from "@/components/dashboard/Skeleton";

interface Agent {
  id: string;
  name: string;
  state: string;
  description?: string;
  hostname?: string | null;
  cpu_millicores?: number;
  cpu?: number;
  memory_mib?: number;
  memory?: number;
}

interface AgentBudget {
  max_agents: number;
  total_cpu: number;
  total_memory: number;
  used_agents: number;
  used_cpu: number;
  used_memory: number;
}

// HyperClaw API expects cpu as integer (CPU units), memory in MiB
const SIZE_PRESETS = [
  { label: "Small", cpu: 1, memory: 256 },
  { label: "Medium", cpu: 1, memory: 512 },
  { label: "Large", cpu: 2, memory: 1024 },
];

export default function AgentsPage() {
  const { getToken } = useTamashiiAuth();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [budget, setBudget] = useState<AgentBudget | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [preset, setPreset] = useState(0); // default Small

  // Whether the current plan is a paid plan (not "free")
  const [hasPaidPlan, setHasPaidPlan] = useState(false);

  const loadAgents = async () => {
    try {
      const token = await getToken();
      console.log("[agents] Loading agents list (auth token present)");
      const [agentsData, planData] = await Promise.all([
        apiFetch<{ items: Agent[]; budget?: AgentBudget }>("/agents", token),
        apiFetch<{ id?: string; plan_id?: string; agents?: number }>("/plans/current", token).catch(() => null),
      ]);
      console.log("[agents] Loaded:", {
        count: agentsData.items?.length ?? 0,
        budget: agentsData.budget,
        planId: planData?.id ?? planData?.plan_id ?? null,
        planAgents: (planData as Record<string, unknown>)?.agents,
      });
      setAgents(agentsData.items ?? []);
      if (agentsData.budget) setBudget(agentsData.budget);
      if (planData) {
        const pid = planData.id ?? planData.plan_id ?? null;
        setCurrentPlanId(pid);
        setHasPaidPlan(!!pid && pid !== "free");
      }
    } catch (err) {
      console.error("[agents] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canCreateAgent = (): { allowed: boolean; reason: string } => {
    // If we have budget data, use it for precise validation
    if (budget) {
      if (budget.max_agents === 0) {
        return {
          allowed: false,
          reason: "Your current plan does not include agent hosting. Upgrade to a plan with agent resources to create agents.",
        };
      }

      if (budget.used_agents >= budget.max_agents) {
        return {
          allowed: false,
          reason: `You've reached your agent limit (${budget.used_agents}/${budget.max_agents}). Upgrade your plan for more agents.`,
        };
      }

      const selectedPreset = SIZE_PRESETS[preset];
      const remainingCpu = budget.total_cpu - budget.used_cpu;
      const remainingMemory = budget.total_memory - budget.used_memory;

      if (selectedPreset.cpu > remainingCpu || selectedPreset.memory > remainingMemory) {
        return {
          allowed: false,
          reason: `Not enough resources for this agent size. Available: ${remainingCpu}m CPU, ${remainingMemory}Mi memory. Upgrade your plan for more capacity.`,
        };
      }

      return { allowed: true, reason: "" };
    }

    // No budget data — allow if user has a paid plan, let the backend enforce limits
    if (hasPaidPlan) {
      return { allowed: true, reason: "" };
    }

    // Free plan or no plan — show upgrade
    return {
      allowed: false,
      reason: "Your current plan does not include agent hosting. Upgrade to a plan with agent resources to create agents.",
    };
  };

  const handleNewAgentClick = () => {
    const check = canCreateAgent();
    if (!check.allowed) {
      setUpgradeReason(check.reason);
      setShowUpgrade(true);
      return;
    }
    setShowCreate(true);
  };

  const createAgent = async () => {
    if (!newName.trim()) return;

    // Re-check budget with selected size before submitting
    const check = canCreateAgent();
    if (!check.allowed) {
      setShowCreate(false);
      setUpgradeReason(check.reason);
      setShowUpgrade(true);
      return;
    }

    setCreating(true);
    setCreateError(null);
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
      setCreateError(null);
      await loadAgents();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create agent";
      // Check if the error is a budget/quota error from the backend
      if (message.includes("budget") || message.includes("limit") || message.includes("quota") || message.includes("upgrade")) {
        setShowCreate(false);
        setUpgradeReason(message);
        setShowUpgrade(true);
      } else {
        setCreateError(message);
      }
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
              {budget.used_cpu}/{budget.total_cpu} CPU &middot;{" "}
              {budget.used_memory}/{budget.total_memory} Mi memory
            </p>
          )}
        </div>
        <button
          onClick={handleNewAgentClick}
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
              <button onClick={() => { setShowCreate(false); setCreateError(null); }} className="text-text-muted hover:text-foreground">
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
                  {SIZE_PRESETS.map((p, i) => {
                    const insufficientCpu = budget ? p.cpu > (budget.total_cpu - budget.used_cpu) : false;
                    const insufficientMem = budget ? p.memory > (budget.total_memory - budget.used_memory) : false;
                    const disabled = insufficientCpu || insufficientMem;

                    return (
                      <button
                        key={p.label}
                        onClick={() => !disabled && setPreset(i)}
                        disabled={disabled}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          disabled
                            ? "border-border bg-surface-low text-text-muted opacity-50 cursor-not-allowed"
                            : preset === i
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-surface-low text-text-secondary hover:border-border-medium"
                        }`}
                      >
                        <div className="text-sm font-medium">{p.label}</div>
                        <div className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1">
                          <Cpu className="w-3 h-3" /> {p.cpu} CPU
                        </div>
                        <div className="text-xs text-text-muted flex items-center justify-center gap-1">
                          <HardDrive className="w-3 h-3" /> {p.memory} Mi
                        </div>
                      </button>
                    );
                  })}
                </div>
                {budget && budget.total_cpu - budget.used_cpu < SIZE_PRESETS[0].cpu && (
                  <p className="text-xs text-warning mt-2">
                    Insufficient resources.{" "}
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        setUpgradeReason("You don't have enough resources to create an agent at any size. Upgrade your plan for more capacity.");
                        setShowUpgrade(true);
                      }}
                      className="text-primary underline underline-offset-2"
                    >
                      Upgrade plan
                    </button>
                  </p>
                )}
              </div>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {createError}
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => { setShowCreate(false); setCreateError(null); }}
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
            onClick={handleNewAgentClick}
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
                <div
                  className="flex items-center gap-3 mb-3 cursor-pointer"
                  onClick={() => isRunning && router.push(`/dashboard/agents/${agent.id}/console`)}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: avatar.bgColor }}
                  >
                    <Icon className="w-5 h-5" style={{ color: avatar.fgColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors">{agent.name}</h3>
                    <span className={`text-xs font-medium ${stateColor(agent.state)}`}>
                      {agent.state}
                    </span>
                  </div>
                </div>

                {(agent.cpu_millicores || agent.cpu || agent.memory_mib || agent.memory) && (
                  <p className="text-xs text-text-muted mb-3">
                    {agent.cpu ?? agent.cpu_millicores} CPU &middot; {agent.memory ?? agent.memory_mib} Mi memory
                  </p>
                )}

                <div className="flex items-center gap-2">
                  {isRunning && (
                    <button
                      onClick={() => router.push(`/dashboard/agents/${agent.id}/console`)}
                      className="flex-1 btn-primary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <Terminal className="w-3 h-3" />
                      Console
                    </button>
                  )}
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

      <UpgradeRequiredModal
        isOpen={showUpgrade}
        reason={upgradeReason}
        onClose={() => setShowUpgrade(false)}
        getToken={getToken}
        currentPlanId={currentPlanId}
      />
    </div>
  );
}
