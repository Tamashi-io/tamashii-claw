"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, RotateCcw } from "lucide-react";

interface ConfigPanelProps {
  config: Record<string, unknown> | null;
  configSchema: Record<string, unknown> | null;
  connected: boolean;
  saveConfig: (patch: Record<string, unknown>) => Promise<void>;
}

export function ConfigPanel({ config, configSchema, connected, saveConfig }: ConfigPanelProps) {
  const [raw, setRaw] = useState("");
  const [original, setOriginal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      const formatted = JSON.stringify(config, null, 2);
      setRaw(formatted);
      setOriginal(formatted);
    }
  }, [config]);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setError("Invalid JSON");
      return;
    }
    setSaving(true);
    try {
      await saveConfig(parsed);
      setOriginal(raw);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRaw(original);
    setError(null);
  };

  const dirty = raw !== original;

  if (!connected) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm">
        Connect to agent to view configuration
      </div>
    );
  }

  if (!config) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading configuration...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Gateway Config
        </span>
        <div className="flex items-center gap-2">
          {success && <span className="text-xs text-green-400">Saved</span>}
          <button
            onClick={handleReset}
            disabled={!dirty}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </button>
        </div>
      </div>
      {error && <div className="px-3 py-1.5 text-xs text-destructive bg-destructive/10">{error}</div>}

      {/* Schema hint */}
      {configSchema && Object.keys(configSchema).length > 0 && (
        <details className="px-3 py-1.5 border-b border-border">
          <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">
            Schema reference
          </summary>
          <pre className="text-[11px] text-text-muted mt-1 overflow-x-auto max-h-32 overflow-y-auto">
            {JSON.stringify(configSchema, null, 2)}
          </pre>
        </details>
      )}

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        className="flex-1 p-3 bg-transparent text-sm font-mono text-foreground resize-none focus:outline-none"
        spellCheck={false}
      />
    </div>
  );
}
