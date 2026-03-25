"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { deleteStrategyFile, uploadStrategyFile } from "@/app/actions/file-actions";
import { STRATEGY_FILE_INPUT_ACCEPT } from "@/lib/strategy-upload-mime";
import type { StrategyFileRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Eye, FileIcon, ImageIcon, Trash2 } from "lucide-react";

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

export function UploadFilesSection({
  strategyId,
  files,
}: {
  strategyId: string;
  files: StrategyFileRow[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function onPick() {
    inputRef.current?.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;
    startTransition(async () => {
      let ok = 0;
      const errors: string[] = [];
      for (const file of Array.from(list)) {
        const fd = new FormData();
        fd.set("file", file);
        try {
          await uploadStrategyFile(strategyId, fd);
          ok += 1;
        } catch (err) {
          errors.push(err instanceof Error ? err.message : "Upload failed");
        }
      }
      if (ok) {
        toast.success(ok === 1 ? "File uploaded" : `${ok} files uploaded`);
        router.refresh();
      }
      if (errors.length) toast.error(errors[0] ?? "Upload failed");
    });
  }

  function onDelete(fileId: string) {
    startTransition(async () => {
      try {
        await deleteStrategyFile(strategyId, fileId);
        toast.success("File removed");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base">Files &amp; screenshots</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {files.length} file{files.length === 1 ? "" : "s"} attached
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            accept={STRATEGY_FILE_INPUT_ACCEPT}
            onChange={onChange}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={onPick}
          >
            Upload files
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">File</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Type</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => {
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            disabled={pending}
                            onClick={() => onDelete(f.id)}
                            aria-label={`Delete ${f.file_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          Allowed: images, PDF, ZIP/RAR/7z, Office, text/code, JSON, and more (see
          server allowlist). Max 50MB per file. View opens in a new tab; Download
          saves via your browser.
        </p>
      </CardContent>
    </Card>
  );
}
