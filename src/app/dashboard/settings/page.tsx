"use client";

import { User, Mail, Wallet, LogOut } from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";

export default function SettingsPage() {
  const { user, logout } = useTamashiiAuth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Account info */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Account</h2>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-low flex items-center justify-center">
              <User className="w-4 h-4 text-text-muted" />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase">User ID</p>
              <p className="text-sm text-foreground font-mono">
                {user?.id ? `${user.id.slice(0, 12)}...` : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-low flex items-center justify-center">
              <Mail className="w-4 h-4 text-text-muted" />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase">Email</p>
              <p className="text-sm text-foreground">
                {user?.email || "Not provided"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-low flex items-center justify-center">
              <Wallet className="w-4 h-4 text-text-muted" />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase">Wallet Address</p>
              <p className="text-sm text-foreground font-mono">
                {user?.walletAddress
                  ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                  : "Not connected"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Session / sign out */}
      <div className="glass-card p-6 border-destructive/20">
        <h2 className="text-lg font-semibold text-foreground mb-2">Session</h2>
        <p className="text-sm text-text-secondary mb-4">
          Sign out of your TamashiiClaw account on this device.
        </p>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
