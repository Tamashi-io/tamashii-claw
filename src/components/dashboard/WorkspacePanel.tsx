"use client";

import { useState } from "react";
import { File, Save, Loader2, ArrowLeft } from "lucide-react";
import type { WorkspaceFile } from "@/hooks/useGatewayChat";

interface WorkspacePanelProps {
  files: WorkspaceFile[];
  connected: boolean;
  openFile: (name: string) => Promise<string>;
  saveFile: (name: string, content: string) => Promise<void>;
}

export function WorkspacePanel({ files, connected, openFile, saveFile }: WorkspacePanelProps) {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const content = await openFile(name);
      setFileContent(content);
      setOriginalContent(content);
      setActiveFile(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open file");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setSaving(true);
    setError(null);
    try {
      await saveFile(activeFile, fileContent);
      setOriginalContent(fileContent);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save file");
    } finally {
      setSaving(false);
    }
  };

  const dirty = fileContent !== originalContent;

  if (!connected) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm">
        Connect to agent to view workspace files
      </div>
    );
  }

  // File editor view
  if (activeFile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <button
            onClick={() => setActiveFile(null)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <span className="text-xs font-mono text-foreground truncate mx-2">{activeFile}</span>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </button>
        </div>
        {error && <div className="px-3 py-1.5 text-xs text-destructive bg-destructive/10">{error}</div>}
        <textarea
          value={fileContent}
          onChange={(e) => setFileContent(e.target.value)}
          className="flex-1 p-3 bg-transparent text-sm font-mono text-foreground resize-none focus:outline-none"
          spellCheck={false}
        />
      </div>
    );
  }

  // File list view
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Workspace Files ({files.length})
        </span>
      </div>
      {error && <div className="px-3 py-1.5 text-xs text-destructive bg-destructive/10">{error}</div>}
      {files.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          No files
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {files.map((f) => (
            <button
              key={f.name}
              onClick={() => handleOpen(f.name)}
              disabled={loading}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-high/50 transition-colors text-left"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-text-muted shrink-0" />
              ) : (
                <File className="w-4 h-4 text-text-muted shrink-0" />
              )}
              <span className="font-mono truncate">{f.name}</span>
              <span className="ml-auto text-xs text-text-muted shrink-0">
                {f.size > 1024 ? `${(f.size / 1024).toFixed(1)}KB` : `${f.size}B`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
