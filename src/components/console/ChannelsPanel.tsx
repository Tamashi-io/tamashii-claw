"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Hash, Bot, Save, Loader2, Check, AlertCircle } from "lucide-react";
import type { GatewayClient } from "@/gateway-client";

interface ChannelsPanelProps {
  gateway: GatewayClient | null;
  connected: boolean;
}

interface ChannelConfig {
  token: string;
  enabled: boolean;
  dmPolicy: string;
}

const CHANNELS = [
  {
    id: "telegram",
    name: "Telegram",
    icon: MessageCircle,
    color: "#26A5E4",
    tokenField: "botToken",
    placeholder: "Bot token from @BotFather",
    helpUrl: "https://core.telegram.org/bots#botfather",
    supportsDmPolicy: true,
  },
  {
    id: "slack",
    name: "Slack",
    icon: Hash,
    color: "#4A154B",
    tokenField: "botToken",
    placeholder: "Bot OAuth token (xoxb-...)",
    helpUrl: "https://api.slack.com/apps",
    supportsDmPolicy: false,
  },
  {
    id: "discord",
    name: "Discord",
    icon: Bot,
    color: "#5865F2",
    tokenField: "token",
    placeholder: "Bot token from Discord Developer Portal",
    helpUrl: "https://discord.com/developers/applications",
    supportsDmPolicy: false,
  },
];

const DM_POLICIES = [
  { value: "pairing", label: "Pairing", desc: "Users request access, you approve" },
  { value: "open", label: "Open", desc: "Anyone can message" },
  { value: "allowlist", label: "Allowlist", desc: "Only specific user IDs" },
  { value: "disabled", label: "Disabled", desc: "No direct messages" },
];

export function ChannelsPanel({ gateway, connected }: ChannelsPanelProps) {
  const [configs, setConfigs] = useState<Record<string, ChannelConfig>>({
    telegram: { token: "", enabled: false, dmPolicy: "pairing" },
    slack: { token: "", enabled: false, dmPolicy: "" },
    discord: { token: "", enabled: false, dmPolicy: "" },
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load existing channel configs from gateway config
  useEffect(() => {
    if (!gateway || !connected || loaded) return;
    let cancelled = false;

    (async () => {
      try {
        const cfg = await gateway.configGet();
        if (cancelled) return;

        const channels = (cfg.channels ?? {}) as Record<string, Record<string, unknown>>;
        const newConfigs: Record<string, ChannelConfig> = { ...configs };

        for (const ch of CHANNELS) {
          const chCfg = channels[ch.id];
          if (chCfg) {
            newConfigs[ch.id] = {
              token: (chCfg[ch.tokenField] as string) ?? "",
              enabled: Boolean(chCfg.enabled),
              dmPolicy: (chCfg.dmPolicy as string) ?? "pairing",
            };
          }
        }
        setConfigs(newConfigs);
        setLoaded(true);
      } catch (err) {
        console.warn("[channels] Failed to load existing config:", err);
        setLoaded(true); // Don't keep retrying
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateway, connected]);

  const updateChannel = (channelId: string, field: keyof ChannelConfig, value: string | boolean) => {
    setConfigs((prev) => ({
      ...prev,
      [channelId]: { ...prev[channelId], [field]: value },
    }));
  };

  const saveChannel = async (channelId: string) => {
    if (!gateway || !connected) return;
    const config = configs[channelId];
    if (!config.token.trim()) return;

    const channelDef = CHANNELS.find((ch) => ch.id === channelId);
    if (!channelDef) return;

    setSaving(channelId);
    setError(null);
    setSaved(null);

    try {
      // Build the channel config patch using correct field names per channel
      const channelPatch: Record<string, unknown> = {
        [channelDef.tokenField]: config.token,
        enabled: config.enabled,
      };

      // Add DM policy for channels that support it
      if (channelDef.supportsDmPolicy && config.dmPolicy) {
        channelPatch.dmPolicy = config.dmPolicy;
      }

      // Telegram: add sensible defaults for groups
      if (channelId === "telegram") {
        channelPatch.groups = { "*": { requireMention: true } };
      }

      // Patch the config via gateway
      await gateway.configPatch({
        channels: {
          [channelId]: channelPatch,
        },
      });

      setSaved(channelId);
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to save ${channelId} config`;
      console.error(`[channels] Save ${channelId} failed:`, err);
      setError(msg);
    } finally {
      setSaving(null);
    }
  };

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        <AlertCircle className="w-4 h-4 mr-2" />
        Connect to the agent gateway to manage channels
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-foreground">Channel Integrations</h3>
        <p className="text-sm text-text-secondary mt-1">
          Connect your agent to messaging platforms. The agent will respond to messages on these channels.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {CHANNELS.map((channel) => {
        const config = configs[channel.id];
        const isSaving = saving === channel.id;
        const isSaved = saved === channel.id;

        return (
          <div key={channel.id} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${channel.color}20` }}
              >
                <channel.icon className="w-5 h-5" style={{ color: channel.color }} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-foreground">{channel.name}</h4>
                <a
                  href={channel.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Setup guide
                </a>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-text-muted">
                  {config.enabled ? "Enabled" : "Disabled"}
                </span>
                <button
                  onClick={() => updateChannel(channel.id, "enabled", !config.enabled)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    config.enabled ? "bg-[#38D39F]" : "bg-surface-low border border-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      config.enabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>
            </div>

            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-text-secondary text-xs mb-1 block">Bot Token</span>
                <input
                  type="password"
                  value={config.token}
                  onChange={(e) => updateChannel(channel.id, "token", e.target.value)}
                  placeholder={channel.placeholder}
                  className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm font-mono focus:outline-none focus:border-primary"
                />
              </label>

              {channel.supportsDmPolicy && (
                <label className="block text-sm">
                  <span className="text-text-secondary text-xs mb-1 block">DM Policy</span>
                  <select
                    value={config.dmPolicy}
                    onChange={(e) => updateChannel(channel.id, "dmPolicy", e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary"
                  >
                    {DM_POLICIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label} — {p.desc}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <button
                onClick={() => saveChannel(channel.id)}
                disabled={isSaving || !config.token.trim()}
                className="btn-primary px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isSaved ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {isSaving ? "Saving..." : isSaved ? "Saved!" : "Save"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
