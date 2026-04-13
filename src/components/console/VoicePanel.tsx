"use client";

import { useState, useRef } from "react";
import { Mic, Play, Loader2, Volume2 } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface VoicePanelProps {
  agentId: string;
  getToken: () => Promise<string>;
}

type Mode = "tts" | "design" | "clone";

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

export function VoicePanel({ agentId, getToken }: VoicePanelProps) {
  const [mode, setMode] = useState<Mode>("tts");
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [voice, setVoice] = useState(VOICES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [refFileName, setRefFileName] = useState<string | null>(null);
  const [refAudioFile, setRefAudioFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefFileName(file.name);
    setRefAudioFile(file);
  };

  const generate = async () => {
    if (!text.trim()) return;
    if (mode === "design" && !description.trim()) return;
    if (mode === "clone" && !refAudioFile) return;

    setLoading(true);
    setError(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);

    try {
      const token = await getToken();
      let endpoint = "";
      let fetchInit: RequestInit;

      if (mode === "tts") {
        endpoint = "/voice/tts";
        fetchInit = {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice, agentId }),
        };
      } else if (mode === "design") {
        endpoint = "/voice/design";
        fetchInit = {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ text, description, agentId }),
        };
      } else {
        endpoint = "/voice/clone";
        const form = new FormData();
        form.append("text", text);
        form.append("refAudio", refAudioFile!);
        if (agentId) form.append("agentId", agentId);
        fetchInit = {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        };
      }

      const res = await fetch(`${API_BASE}${endpoint}`, fetchInit);

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setTimeout(() => audioRef.current?.play(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Volume2 className="w-5 h-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Voice Synthesis</h2>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        {(["tts", "design", "clone"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? "bg-primary text-white"
                : "bg-surface-low border border-border text-text-secondary hover:border-border-medium"
            }`}
          >
            {m === "tts" ? "Text to Speech" : m === "design" ? "Voice Design" : "Voice Clone"}
          </button>
        ))}
      </div>

      {/* Text input */}
      <div>
        <label className="block text-sm text-text-secondary mb-1.5">Text to speak</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Enter text to synthesize..."
          className="w-full px-3 py-2 rounded-lg bg-surface-low border border-border text-foreground text-sm placeholder:text-text-muted focus:outline-none focus:border-primary resize-none"
        />
      </div>

      {/* TTS: voice selector */}
      {mode === "tts" && (
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">Voice</label>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-low border border-border text-foreground text-sm focus:outline-none focus:border-primary"
          >
            {VOICES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      )}

      {/* Design: description */}
      {mode === "design" && (
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">Voice description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. A deep, calm male voice with a slight British accent"
            className="w-full px-3 py-2 rounded-lg bg-surface-low border border-border text-foreground text-sm placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
        </div>
      )}

      {/* Clone: reference audio upload */}
      {mode === "clone" && (
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">Reference audio</label>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-2 rounded-lg bg-surface-low border border-border text-sm text-text-secondary hover:border-border-medium transition-colors"
          >
            <Mic className="w-4 h-4 inline mr-2" />
            {refFileName ?? "Upload audio file (.mp3, .wav, .ogg)"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        onClick={generate}
        disabled={loading || !text.trim() || (mode === "design" && !description.trim()) || (mode === "clone" && !refAudioFile)}
        className="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {loading ? "Generating..." : "Generate"}
      </button>

      {audioUrl && (
        <div>
          <p className="text-xs text-text-muted mb-2">Audio ready</p>
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
