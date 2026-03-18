"use client";

import { useState, useEffect, useCallback } from "react";
import { Cpu, Plus, Trash2, Star, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import type { GatewayClient } from "@/gateway-client";

interface Model {
  id: string;
  name?: string;
  provider?: string;
  isDefault?: boolean;
}

interface ModelsPanelProps {
  gateway: GatewayClient | null;
  connected: boolean;
}

export function ModelsPanel({ gateway, connected }: ModelsPanelProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  // Add provider form
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProviderId, setNewProviderId] = useState("");
  const [newProviderApi, setNewProviderApi] = useState("openai");
  const [newProviderUrl, setNewProviderUrl] = useState("");
  const [newProviderKey, setNewProviderKey] = useState("");
  const [addingProvider, setAddingProvider] = useState(false);

  const loadModels = useCallback(async () => {
    if (!gateway || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const result = await gateway.modelsList();
      setModels(
        result.map((m: any) => ({
          id: m.id ?? m.modelId ?? "",
          name: m.name ?? m.id ?? "",
          provider: m.provider ?? m.providerId ?? "",
          isDefault: m.isDefault ?? m.default ?? false,
        })),
      );
      const def = result.find((m: any) => m.isDefault || m.default);
      if (def) setDefaultModel(def.id ?? def.modelId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load models");
    } finally {
      setLoading(false);
    }
  }, [gateway, connected]);

  useEffect(() => {
    if (connected) loadModels();
  }, [connected, loadModels]);

  const handleSetDefault = async (providerId: string, modelId: string) => {
    if (!gateway) return;
    setSettingDefault(modelId);
    try {
      await gateway.call("config.patch", {
        patch: { default_model: `${providerId}/${modelId}` },
      });
      setDefaultModel(modelId);
      await loadModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set default model");
    } finally {
      setSettingDefault(null);
    }
  };

  const handleAddProvider = async () => {
    if (!gateway || !newProviderId.trim()) return;
    setAddingProvider(true);
    setError(null);
    try {
      await gateway.call("providers.upsert", {
        providerId: newProviderId,
        config: {
          api: newProviderApi,
          baseUrl: newProviderUrl || undefined,
          apiKey: newProviderKey || undefined,
        },
      });
      setShowAddProvider(false);
      setNewProviderId("");
      setNewProviderUrl("");
      setNewProviderKey("");
      await loadModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add provider");
    } finally {
      setAddingProvider(false);
    }
  };

  const handleRemoveModel = async (providerId: string, modelId: string) => {
    if (!gateway) return;
    try {
      await gateway.call("models.remove", { providerId, modelId });
      await loadModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove model");
    }
  };

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        <AlertCircle className="w-4 h-4 mr-2" />
        Connect to the agent gateway to manage models
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">LLM Providers &amp; Models</h3>
          <p className="text-sm text-text-secondary mt-1">
            Configure which AI models your agent can use.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadModels}
            disabled={loading}
            className="btn-secondary px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddProvider(!showAddProvider)}
            className="btn-primary px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Provider
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add Provider Form */}
      {showAddProvider && (
        <div className="glass-card p-5 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">New Provider</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-text-secondary text-xs">Provider ID</span>
              <input
                value={newProviderId}
                onChange={(e) => setNewProviderId(e.target.value)}
                placeholder="e.g. openai, anthropic, ollama"
                className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-text-secondary text-xs">API Type</span>
              <select
                value={newProviderApi}
                onChange={(e) => setNewProviderApi(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              >
                <option value="openai">OpenAI-compatible</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-text-secondary text-xs">Base URL (optional)</span>
              <input
                value={newProviderUrl}
                onChange={(e) => setNewProviderUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-text-secondary text-xs">API Key (optional)</span>
              <input
                type="password"
                value={newProviderKey}
                onChange={(e) => setNewProviderKey(e.target.value)}
                placeholder="sk-..."
                className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddProvider}
              disabled={addingProvider || !newProviderId.trim()}
              className="btn-primary px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              {addingProvider && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add Provider
            </button>
            <button
              onClick={() => setShowAddProvider(false)}
              className="btn-secondary px-4 py-1.5 rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Models List */}
      {loading && models.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading models...
        </div>
      ) : models.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Cpu className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary mb-1">No models configured</p>
          <p className="text-sm text-text-muted">
            Add a provider to get started with AI inference.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((model) => (
            <div
              key={`${model.provider}-${model.id}`}
              className="glass-card px-4 py-3 flex items-center gap-3"
            >
              <Cpu className="w-4 h-4 text-text-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {model.name || model.id}
                  </span>
                  {model.id === defaultModel && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#38D39F]/10 text-[#38D39F]">
                      Default
                    </span>
                  )}
                </div>
                {model.provider && (
                  <span className="text-xs text-text-muted">{model.provider}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {model.id !== defaultModel && (
                  <button
                    onClick={() => handleSetDefault(model.provider ?? "", model.id)}
                    disabled={settingDefault === model.id}
                    className="p-1.5 rounded text-text-muted hover:text-[#f0c56c] hover:bg-[#f0c56c]/10 transition-colors"
                    title="Set as default"
                  >
                    {settingDefault === model.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Star className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleRemoveModel(model.provider ?? "", model.id)}
                  className="p-1.5 rounded text-text-muted hover:text-[#d05f5f] hover:bg-[#d05f5f]/10 transition-colors"
                  title="Remove model"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
