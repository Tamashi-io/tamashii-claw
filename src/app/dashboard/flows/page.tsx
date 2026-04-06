"use client";

import { useState, useEffect } from "react";
import { Zap, Loader2, X, ChevronRight, DollarSign } from "lucide-react";
import { useTamashiiAuth } from "@/hooks/useTamashiiAuth";
import { apiFetch } from "@/lib/api";

interface FlowCatalogItem {
  flowType: string;
  priceUsd: number;
  type: string;
  template?: string | null;
  interruptible?: boolean | null;
}

interface FlowResult {
  render?: { id?: string; status?: string; output_url?: string; [key: string]: unknown };
  accessKey?: string;
  statusUrl?: string;
  cancelUrl?: string;
  [key: string]: unknown;
}

const FLOW_PARAM_HINTS: Record<string, { label: string; placeholder: string }[]> = {
  "text-to-image": [
    { label: "prompt", placeholder: "A cat wearing sunglasses on a beach" },
    { label: "width", placeholder: "1024" },
    { label: "height", placeholder: "1024" },
  ],
  "text-to-video": [
    { label: "prompt", placeholder: "A cat walking through a garden" },
  ],
  "image-to-video": [
    { label: "prompt", placeholder: "The character starts dancing" },
    { label: "image_url", placeholder: "https://..." },
  ],
};

export default function FlowsPage() {
  const { getToken } = useTamashiiAuth();
  const [catalog, setCatalog] = useState<FlowCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<FlowCatalogItem | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [result, setResult] = useState<FlowResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await apiFetch<FlowCatalogItem[]>("/x402/flows/catalog", token);
        setCatalog(Array.isArray(data) ? data : []);
      } catch {
        setCatalog([]);
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openFlow = (flow: FlowCatalogItem) => {
    setSelectedFlow(flow);
    setParams({});
    setLaunchError(null);
    setResult(null);
  };

  const launch = async () => {
    if (!selectedFlow) return;
    setLaunching(true);
    setLaunchError(null);
    setResult(null);
    try {
      const token = await getToken();
      const data = await apiFetch<FlowResult>(`/x402/flows/${selectedFlow.flowType}`, token, {
        method: "POST",
        body: JSON.stringify({ params }),
      });
      setResult(data);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setLaunching(false);
    }
  };

  const hints = selectedFlow ? (FLOW_PARAM_HINTS[selectedFlow.flowType] ?? [{ label: "prompt", placeholder: "Describe your output..." }]) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Flows</h1>
          <p className="text-xs text-text-muted mt-1">Pay-per-use AI renders via USDC on Base</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading catalog...
        </div>
      ) : catalog.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-text-muted text-sm">No flows available. Check your API key configuration.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map((flow) => (
            <button
              key={flow.flowType}
              onClick={() => openFlow(flow)}
              className="glass-card p-5 text-left hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors mt-1" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{flow.flowType}</h3>
              <p className="text-xs text-text-muted mb-3 capitalize">{flow.type}</p>
              <div className="flex items-center gap-1 text-xs font-medium text-[#38D39F]">
                <DollarSign className="w-3 h-3" />
                {flow.priceUsd.toFixed(2)} USDC
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Launch Modal */}
      {selectedFlow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selectedFlow.flowType}</h2>
                <p className="text-xs text-[#38D39F] mt-0.5 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {selectedFlow.priceUsd.toFixed(2)} USDC
                </p>
              </div>
              <button onClick={() => setSelectedFlow(null)} className="text-text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {result ? (
              <div className="space-y-4">
                <p className="text-sm text-[#38D39F] font-medium">Flow launched successfully</p>
                {result.render?.output_url && (
                  <a
                    href={result.render.output_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-primary underline underline-offset-2 truncate"
                  >
                    {result.render.output_url}
                  </a>
                )}
                {result.statusUrl && (
                  <p className="text-xs text-text-muted">Status: <span className="font-mono">{result.statusUrl}</span></p>
                )}
                <pre className="text-xs bg-surface-low rounded p-3 overflow-auto max-h-40 text-text-secondary">
                  {JSON.stringify(result, null, 2)}
                </pre>
                <button onClick={() => setSelectedFlow(null)} className="btn-primary w-full px-4 py-2 rounded-lg text-sm font-medium">
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {hints.map((hint) => (
                  <div key={hint.label}>
                    <label className="block text-sm text-text-secondary mb-1.5 capitalize">{hint.label}</label>
                    <input
                      type="text"
                      value={params[hint.label] ?? ""}
                      onChange={(e) => setParams((p) => ({ ...p, [hint.label]: e.target.value }))}
                      placeholder={hint.placeholder}
                      className="w-full px-3 py-2 rounded-lg bg-surface-low border border-border text-foreground text-sm placeholder:text-text-muted focus:outline-none focus:border-primary"
                    />
                  </div>
                ))}

                {launchError && (
                  <p className="text-sm text-destructive">{launchError}</p>
                )}

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setSelectedFlow(null)}
                    className="flex-1 btn-secondary px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={launch}
                    disabled={launching}
                    className="flex-1 btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {launching ? "Launching..." : `Launch · $${selectedFlow.priceUsd.toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
