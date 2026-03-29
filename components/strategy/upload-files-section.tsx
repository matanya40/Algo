"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { deleteStrategyFile } from "@/app/actions/file-actions";
import { normalizeStrategyFileRow } from "@/lib/strategy-file-row";
import type { StrategyFileRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Eye, FileIcon, ImageIcon, Trash2, Upload } from "lucide-react";

function fileIcon(mime: string | null) {
  if (mime?.startsWith("image/")) return ImageIcon;
  return FileIcon;
}

function fileApiPath(strategyId: string, fileId: string, view: boolean) {
  return `/api/strategy-file/${strategyId}/${fileId}${view ? "?view=1" : ""}`;
}

function formatSize(bytes: number | null) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mergeStrategyFileRows(
  server: StrategyFileRow[],
  local: StrategyFileRow[]
): StrategyFileRow[] {
  const map = new Map<string, StrategyFileRow>();
  for (const r of server) map.set(r.id, r);
  for (const r of local) {
    if (!map.has(r.id)) map.set(r.id, r);
  }
  return dedupeRowsById(Array.from(map.values()));
}

function dedupeRowsById(rows: StrategyFileRow[]): StrategyFileRow[] {
  const map = new Map<string, StrategyFileRow>();
  for (const r of rows) map.set(r.id, r);
  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return tb - ta;
  });
}

async function postOneFile(
  strategyId: string,
  file: File
): Promise<StrategyFileRow> {
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch(
    `/api/strategy-files/${encodeURIComponent(strategyId)}/upload`,
    {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    }
  );
  const data = (await res.json().catch(() => ({}))) as {
    row?: unknown;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  if (data.row == null) {
    throw new Error("Invalid response from server");
  }
  return normalizeStrategyFileRow(data.row);
}

export function UploadFilesSection({
  strategyId,
  files,
  readOnly = false,
}: {
  strategyId: string;
  files: StrategyFileRow[];
  /** View / download only (shared strategies). */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const uploadLockRef = useRef(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [pendingAdditions, setPendingAdditions] = useState<StrategyFileRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const rows = useMemo(() => {
    const merged = dedupeRowsById(
      mergeStrategyFileRows(files, pendingAdditions)
    );
    const gone = new Set(deletedIds);
    return merged.filter((r) => !gone.has(r.id));
  }, [files, pendingAdditions, deletedIds]);

  useEffect(() => {
    setPendingAdditions((prev) =>
      prev.filter((p) => !files.some((f) => f.id === p.id))
    );
    setDeletedIds((prev) =>
      prev.filter((id) => files.some((f) => f.id === id))
    );
  }, [files]);

  const runUploads = useCallback(
    async (fileList: File[]) => {
      if (!fileList.length) return;
      if (uploadLockRef.current) {
        toast.warning("Wait for the current upload to finish.");
        return;
      }
      uploadLockRef.current = true;
      setIsUploading(true);
      let ok = 0;
      try {
        for (const file of fileList) {
          try {
            const row = await postOneFile(strategyId, file);
            setPendingAdditions((prev) =>
              prev.some((p) => p.id === row.id) ? prev : [...prev, row]
            );
            ok += 1;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Upload failed";
            toast.error(msg);
          }
        }
        if (ok) {
          toast.success(ok === 1 ? "File uploaded" : `${ok} files uploaded`);
          router.refresh();
        }
      } finally {
        uploadLockRef.current = false;
        setIsUploading(false);
      }
    },
    [strategyId, router]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      void runUploads(accepted);
    },
    [runUploads]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    disabled: isUploading || readOnly,
    multiple: true,
    noClick: false,
    noKeyboard: false,
  });

  function onDelete(fileId: string) {
    startDeleteTransition(async () => {
      try {
        await deleteStrategyFile(strategyId, fileId);
        setPendingAdditions((prev) => prev.filter((r) => r.id !== fileId));
        setDeletedIds((prev) =>
          prev.includes(fileId) ? prev : [...prev, fileId]
        );
        toast.success("File removed");
        setTimeout(() => router.refresh(), 400);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  return (
    <Card className="overflow-hidden border-border/80 bg-gradient-to-b from-card to-muted/20 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/60 bg-muted/20 pb-4">
        <div>
          <CardTitle className="text-base">Files &amp; screenshots</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {rows.length} file{rows.length === 1 ? "" : "s"} attached
          </p>
        </div>
        {!readOnly ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isUploading}
            onClick={() => open()}
          >
            {isUploading ? "Uploading…" : "Browse…"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {!readOnly ? (
          <div
            {...getRootProps({
              className: cn(
                "relative flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
                "border-primary/35 bg-gradient-to-br from-primary/[0.06] via-muted/40 to-muted/20",
                "hover:border-primary/50 hover:from-primary/[0.09]",
                isDragActive && "border-primary ring-2 ring-primary/30",
                isUploading && "pointer-events-none opacity-60"
              ),
            })}
          >
            <input {...getInputProps()} />
            <Upload
              className="h-8 w-8 text-muted-foreground"
              aria-hidden
            />
            <p className="text-sm font-medium text-foreground">
              {isDragActive
                ? "Drop files here…"
                : "Drag files here or click to choose"}
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Multiple files · server validates type (images, PDF, archives, office,
              code). Max 50MB each.
            </p>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            {readOnly
              ? "No files attached."
              : "No files yet — use the area above."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/80 bg-card/50">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">File</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">
                    Type
                  </th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => {
                  const Icon = fileIcon(f.mime_type);
                  const viewUrl = fileApiPath(strategyId, f.id, true);
                  const downloadUrl = fileApiPath(strategyId, f.id, false);
                  const typeLabel =
                    f.mime_type?.split("/").pop() || f.file_type || "—";
                  return (
                    <tr
                      key={f.id}
                      className="border-b border-border/80 last:border-0"
                    >
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span
                            className="truncate font-mono text-xs"
                            title={f.file_name}
                          >
                            {f.file_name}
                          </span>
                        </div>
                      </td>
                      <td className="hidden max-w-[100px] truncate px-3 py-2 font-mono text-xs text-muted-foreground sm:table-cell">
                        {typeLabel}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">
                        {formatSize(f.size_bytes)}
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                            <a
                              href={viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open in new tab"
                              aria-label={`View ${f.file_name}`}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                            <a
                              href={downloadUrl}
                              title="Download"
                              aria-label={`Download ${f.file_name}`}
                            >
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Download</span>
                            </a>
                          </Button>
                          {!readOnly ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                              disabled={isDeleting}
                              onClick={() => onDelete(f.id)}
                              aria-label={`Delete ${f.file_name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
