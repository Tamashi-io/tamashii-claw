"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  File,
  FolderOpen,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { apiFetch, apiFetchRaw, apiUploadRaw } from "@/lib/api";

interface S3Entry {
  name: string;
  path: string;
  size?: number;
  type?: string;
}

interface S3FilesPanelProps {
  agentId: string;
  getToken: () => Promise<string>;
  active: boolean;
}

function isHidden(name: string): boolean {
  return name.startsWith(".");
}

function formatSize(size?: number): string {
  if (size === undefined || Number.isNaN(size)) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function S3FilesPanel({ agentId, getToken, active }: S3FilesPanelProps) {
  const [prefix, setPrefix] = useState("");
  const [directories, setDirectories] = useState<S3Entry[]>([]);
  const [files, setFiles] = useState<S3Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadFiles = useCallback(
    async (targetPrefix: string) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const qs = targetPrefix
          ? `?prefix=${encodeURIComponent(targetPrefix)}`
          : "";
        const data = await apiFetch<{
          directories?: S3Entry[];
          files?: S3Entry[];
        }>(`/agents/${agentId}/files${qs}`, token);
        setPrefix(targetPrefix);
        setDirectories(
          (data.directories ?? []).map((d) => ({ ...d, type: "directory" }))
        );
        setFiles(
          (data.files ?? []).map((f) => ({ ...f, type: "file" }))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load files");
        setDirectories([]);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    },
    [agentId, getToken]
  );

  useEffect(() => {
    if (active) loadFiles(prefix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const goToPrefix = useCallback(
    (next: string) => {
      setPrefix(next);
      loadFiles(next);
    },
    [loadFiles]
  );

  const uploadFiles = useCallback(
    async (uploadList: FileList) => {
      setUploading(true);
      setError(null);
      try {
        const token = await getToken();
        for (const file of Array.from(uploadList)) {
          const uploadPath = `${prefix}${file.name}`;
          const qs = `?path=${encodeURIComponent(uploadPath)}`;
          await apiUploadRaw(
            `/agents/${agentId}/files/upload${qs}`,
            token,
            await file.arrayBuffer()
          );
        }
        await loadFiles(prefix);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [agentId, getToken, loadFiles, prefix]
  );

  const downloadFile = useCallback(
    async (path: string) => {
      setError(null);
      try {
        const token = await getToken();
        const qs = `?path=${encodeURIComponent(path)}`;
        const resp = await apiFetchRaw(
          `/agents/${agentId}/files/download${qs}`,
          token
        );
        const blob = await resp.blob();
        const filename =
          path
            .split("/")
            .filter(Boolean)
            .pop() || "download";
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Download failed");
      }
    },
    [agentId, getToken]
  );

  const deleteFile = useCallback(
    async (path: string, name: string) => {
      if (!window.confirm(`Delete "${name}"?`)) return;
      setError(null);
      try {
        const token = await getToken();
        const qs = `?path=${encodeURIComponent(path)}`;
        await apiFetch(`/agents/${agentId}/files/delete${qs}`, token, {
          method: "DELETE",
        });
        await loadFiles(prefix);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    },
    [agentId, getToken, loadFiles, prefix]
  );

  // Drag-and-drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      if (e.dataTransfer.files?.length) {
        void uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  const pathParts = prefix.split("/").filter(Boolean);
  const hiddenCount =
    directories.filter((d) => isHidden(d.name)).length +
    files.filter((f) => isHidden(f.name)).length;

  return (
    <div
      className="flex flex-col h-full relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-surface-low/80 border-2 border-dashed border-primary rounded flex items-center justify-center pointer-events-none">
          <div className="text-primary text-sm font-medium flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Drop files to upload
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              void uploadFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground disabled:opacity-40 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          Upload
        </button>
        <button
          onClick={() => loadFiles(prefix)}
          disabled={loading}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded text-text-muted hover:text-foreground border border-border transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
        {hiddenCount > 0 && (
          <span className="text-[11px] text-text-muted border border-border rounded-full px-2 py-0.5">
            {hiddenCount} hidden
          </span>
        )}
        <div className="flex-1" />
        <span className="text-xs text-text-muted">
          {uploading ? "Uploading..." : "Drag & drop or click Upload"}
        </span>
      </div>

      {/* Breadcrumbs */}
      <div className="px-3 py-1.5 border-b border-border bg-surface-low/50 text-xs text-text-muted font-mono flex items-center gap-1 overflow-x-auto">
        <button onClick={() => goToPrefix("")} className="hover:text-foreground">
          /
        </button>
        {pathParts.map((part, idx) => {
          const partPrefix = `${pathParts.slice(0, idx + 1).join("/")}/`;
          return (
            <span key={partPrefix} className="flex items-center gap-1">
              <span>/</span>
              <button
                onClick={() => goToPrefix(partPrefix)}
                className="hover:text-foreground whitespace-nowrap"
              >
                {part}
              </button>
            </span>
          );
        })}
      </div>

      {error && (
        <div className="px-3 py-1.5 text-xs text-destructive bg-destructive/10 border-b border-border">
          {error}
        </div>
      )}

      {/* File listing */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
          </div>
        ) : (
          <div className="p-1">
            {/* Directories */}
            {directories.map((dir) => {
              const nextPrefix =
                dir.path || `${prefix}${dir.name.replace(/\/?$/, "/")}`;
              return (
                <button
                  key={`dir-${dir.path || dir.name}`}
                  onClick={() => goToPrefix(nextPrefix)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-surface-high/50 text-left transition-colors ${
                    isHidden(dir.name) ? "opacity-60" : ""
                  }`}
                >
                  <FolderOpen className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-sm font-mono text-foreground flex-1 truncate">
                    {dir.name}
                  </span>
                  <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
                </button>
              );
            })}

            {/* Files */}
            {files.map((file) => (
              <div
                key={`file-${file.path || file.name}`}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-surface-high/50 transition-colors ${
                  isHidden(file.name) ? "opacity-60" : ""
                }`}
              >
                <File className="w-4 h-4 text-text-muted shrink-0" />
                <span className="text-sm font-mono text-foreground flex-1 truncate">
                  {file.name}
                </span>
                <span className="text-xs text-text-muted w-20 text-right shrink-0">
                  {formatSize(file.size)}
                </span>
                <button
                  onClick={() => downloadFile(file.path)}
                  className="text-text-muted hover:text-foreground p-1 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteFile(file.path, file.name)}
                  className="text-text-muted hover:text-destructive p-1 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Empty state */}
            {directories.length === 0 && files.length === 0 && (
              <div className="p-8 text-center text-sm text-text-muted">
                No files in this directory.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
