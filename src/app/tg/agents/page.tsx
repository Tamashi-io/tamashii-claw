"use client";

import { useCallback, useEffect, useState } from "react";
import { useTelegramAuth } from "@/components/TelegramAuthProvider";
import { apiFetch } from "@/lib/api";
import { Bot, Play, Square, Plus, Trash2, Loader2 } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  state: string;
  hostname?: string;
  cpu_millicores?: number;
  memory_mib?: number;
}

interface Budget {
  max_agents: number;
  used_agents: number;
}

const DEFAULT_IMAGE = "ghcr.io/hypercli/hypercli-openclaw:prod";

export default function TgAgentsPage() {
  const { getToken } = useTelegramAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadAgents = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await apiFetch<{ items: Agent[]; budget?: Budget }>("/agents", token);
      setAgents(res.items ?? []);
      setBudget(res.budget ?? null);
    } catch (err) {
      console.error("[tg-agents] Load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const startAgent = async (id: string) => {
    setActionId(id);
    try {
      const token = await getToken();
      await apiFetch(`/agents/${id}/start`, token, {
        method: "POST",
        body: JSON.stringify({ config: { image: DEFAULT_IMAGE } }),
      });
      await loadAgents();
    } catch (err) {
      console.error("[tg-agents] Start failed:", err);
    } finally {
      setActionId(null);
    }
  };

  const stopAgent = async (id: string) => {
    setActionId(id);
    try {
      const token = await getToken();
      await apiFetch(`/agents/${id}/stop`, token, { method: "POST" });
      await loadAgents();
    } catch (err) {
      console.error("[tg-agents] Stop failed:", err);
    } finally {
      setActionId(null);
    }
  };

  const deleteAgent = async (id: string) => {
    if (!confirm("Delete this agent?")) return;
    setActionId(id);
    try {
      const token = await getToken();
      await apiFetch(`/agents/${id}`, token, { method: "DELETE" });
      await loadAgents();
    } catch (err) {
      console.error("[tg-agents] Delete failed:", err);
    } finally {
      setActionId(null);
    }
  };

  const createAgent = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      await apiFetch("/agents", token, {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          cpu_millicores: 500,
          memory_mib: 4096,
          start: true,
          config: { image: DEFAULT_IMAGE },
        }),
      });
      setNewName("");
      setShowCreate(false);
      await loadAgents();
    } catch (err: any) {
      const msg = err?.message || String(err);
      alert(`Failed to create agent: ${msg}`);
    } finally {
      setCreating(false);
    }
  };

  const canCreate = budget ? budget.used_agents < budget.max_agents : true;

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Agents</h1>
        {canCreate && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-cyan-500 text-white p-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white/5 rounded-xl p-4 mb-4">
          <input
            type="text"
            placeholder="Agent name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-1 focus:ring-cyan-400"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={createAgent}
              disabled={creating || !newName.trim()}
              className="flex-1 bg-cyan-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Create & Start"
              )}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 bg-white/10 text-gray-300 rounded-lg py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white/5 rounded-xl p-8 text-center">
          <Bot className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-1">No agents yet</p>
          <p className="text-gray-500 text-xs">
            {canCreate
              ? "Tap + to create your first agent"
              : "Upgrade your plan to create agents"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => {
            const isActing = actionId === agent.id;
            const isRunning = agent.state === "RUNNING";
            const isStopped = agent.state === "STOPPED";

            return (
              <div key={agent.id} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Bot className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.id.slice(0, 12)}...</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isRunning
                        ? "bg-green-500/20 text-green-400"
                        : isStopped
                          ? "bg-gray-500/20 text-gray-400"
                          : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {agent.state}
                  </span>
                </div>

                <div className="flex gap-2">
                  {isStopped && (
                    <button
                      onClick={() => startAgent(agent.id)}
                      disabled={isActing}
                      className="flex-1 bg-green-500/20 text-green-400 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isActing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      Start
                    </button>
                  )}
                  {isRunning && (
                    <button
                      onClick={() => stopAgent(agent.id)}
                      disabled={isActing}
                      className="flex-1 bg-red-500/20 text-red-400 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isActing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Square className="w-3 h-3" />
                      )}
                      Stop
                    </button>
                  )}
                  <button
                    onClick={() => deleteAgent(agent.id)}
                    disabled={isActing}
                    className="bg-white/5 text-gray-400 rounded-lg py-2 px-3 text-xs flex items-center justify-center disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Budget info */}
      {budget && (
        <p className="text-center text-xs text-gray-500 mt-4">
          {budget.used_agents}/{budget.max_agents} agents used
        </p>
      )}
    </div>
  );
}
