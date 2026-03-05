"use client";

import { useState, useEffect } from "react";
import { Plus, Copy, Eye, EyeOff, Trash2, Check } from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";
import { apiFetch } from "@/lib/api";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used?: string;
}

export default function KeysPage() {
  const { getToken } = useTamashiiAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);

  const loadKeys = async () => {
    try {
      const token = await getToken();
      const data = await apiFetch<{ keys: ApiKey[] }>("/keys", token);
      setKeys(data.keys ?? []);
    } catch {
      // Keys not available
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      await apiFetch("/keys", token, {
        method: "POST",
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      setNewKeyName("");
      await loadKeys();
    } catch (err) {
      console.error("Failed to create key:", err);
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async () => {
    if (!deleteTarget) return;
    try {
      const token = await getToken();
      await apiFetch(`/keys/${deleteTarget.id}`, token, { method: "DELETE" });
      setDeleteTarget(null);
      await loadKeys();
    } catch (err) {
      console.error("Failed to revoke key:", err);
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">API Keys</h1>

      {/* Create key */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Create New Key</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. production)"
            className="flex-1 px-3 py-2 rounded-lg bg-input-background border border-border text-foreground text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => e.key === "Enter" && createKey()}
          />
          <button
            onClick={createKey}
            disabled={creating || !newKeyName.trim()}
            className="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </div>

      {/* Keys list */}
      <div className="space-y-3">
        {loading ? (
          <div className="glass-card p-8 text-center text-text-muted text-sm">
            Loading keys...
          </div>
        ) : keys.length === 0 ? (
          <div className="glass-card p-8 text-center text-text-muted text-sm">
            No API keys yet. Create one to get started.
          </div>
        ) : (
          keys.map((apiKey) => (
            <div key={apiKey.id} className="glass-card p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{apiKey.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs text-text-muted font-mono">
                    {revealedKey === apiKey.id ? apiKey.key : `${apiKey.key.slice(0, 8)}...${apiKey.key.slice(-4)}`}
                  </code>
                </div>
                <div className="text-xs text-text-muted mt-1">
                  Created {new Date(apiKey.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRevealedKey(revealedKey === apiKey.id ? null : apiKey.id)}
                  className="p-2 text-text-muted hover:text-foreground transition-colors"
                >
                  {revealedKey === apiKey.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => copyToClipboard(apiKey.key)}
                  className="p-2 text-text-muted hover:text-foreground transition-colors"
                >
                  {copiedKey === apiKey.key ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setDeleteTarget(apiKey)}
                  className="p-2 text-text-muted hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Revoke API Key"
        message={`Are you sure you want to revoke "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Revoke"
        danger
        onConfirm={revokeKey}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
