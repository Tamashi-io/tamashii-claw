"use client";

import { useState, useEffect } from "react";
import { X, Key, Bot } from "lucide-react";
import { useRouter } from "next/navigation";

const DISMISSED_KEY = "tamashiiclaw_onboarding_dismissed";

export function OnboardingGuide() {
  const [dismissed, setDismissed] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="glass-card p-5 relative">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-text-muted hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <h3 className="text-sm font-semibold text-foreground mb-4">Getting Started</h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => router.push("/dashboard/keys")}
          className="flex items-start gap-3 p-3 rounded-lg bg-surface-low/50 border border-border hover:border-border-medium transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Key className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Connect to the Network</p>
            <p className="text-xs text-text-muted mt-0.5">
              Create an API key and start using decentralized inference
            </p>
          </div>
        </button>

        <button
          onClick={() => router.push("/dashboard/agents")}
          className="flex items-start gap-3 p-3 rounded-lg bg-surface-low/50 border border-border hover:border-border-medium transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Deploy an Agent</p>
            <p className="text-xs text-text-muted mt-0.5">
              Launch a persistent autonomous agent on the network
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
