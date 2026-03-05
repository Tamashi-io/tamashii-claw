"use client";

import { LogOut } from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";

export default function SettingsPage() {
  const { user, logout } = useTamashiiAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      <div className="glass-card p-6 max-w-lg">
        <h3 className="text-sm font-semibold text-foreground mb-4">Account</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted block mb-1">User ID</label>
            <code className="text-sm text-text-secondary font-mono bg-surface-low px-3 py-1.5 rounded block">
              {user?.id ?? "—"}
            </code>
          </div>

          <div>
            <label className="text-xs text-text-muted block mb-1">Email</label>
            <code className="text-sm text-text-secondary font-mono bg-surface-low px-3 py-1.5 rounded block">
              {user?.email ?? "—"}
            </code>
          </div>

          <div>
            <label className="text-xs text-text-muted block mb-1">Wallet</label>
            <code className="text-sm text-text-secondary font-mono bg-surface-low px-3 py-1.5 rounded block">
              {user?.walletAddress ?? "—"}
            </code>
          </div>
        </div>

        <div className="border-t border-border mt-6 pt-6">
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
