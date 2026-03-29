"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  removeStrategyDocTabAsset,
  updateStrategyDocumentationTabs,
  uploadStrategyDocTabAsset,
} from "@/app/actions/strategy-doc-tab-actions";
import type { StrategyDocTab } from "@/lib/strategy-doc-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FileIcon, Loader2, Save, Trash2, Upload } from "lucide-react";

function assetUrl(strategyId: string, path: string, mime: string | null, view: boolean) {
  const params = new URLSearchParams();
  params.set("path", path);
  if (view) params.set("view", "1");
  if (mime) params.set("mime", mime);
  return `/api/strategy-doc-asset/${encodeURIComponent(strategyId)}?${params.toString()}`;
}

export function StrategyDocumentationTabsEditor({
  strategyId,
  initialTabs,
}: {
  strategyId: string;
  initialTabs: StrategyDocTab[];
}) {
  const router = useRouter();
  const [tabs, setTabs] = useState<StrategyDocTab[]>(initialTabs);

  useEffect(() => {
    setTabs(initialTabs);
  }, [initialTabs]);
  const [pending, startTransition] = useTransition();
  const [uploadingTab, setUploadingTab] = useState<string | null>(null);

  const saveText = useCallback(() => {
    startTransition(async () => {
      try {
        await updateStrategyDocumentationTabs(strategyId, tabs);
        toast.success("Documentation saved");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      }
    });
  }, [strategyId, tabs, router]);

  const onUpload = (tabId: string, file: File | undefined) => {
    if (!file) return;
    setUploadingTab(tabId);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("file", file);
        const res = await uploadStrategyDocTabAsset(strategyId, tabId, fd);
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId ? { ...t, asset: res.asset } : t
          )
        );
        toast.success("File attached");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploadingTab(null);
      }
    });
  };

  const onRemoveAsset = (tabId: string) => {
    startTransition(async () => {
      try {
        await removeStrategyDocTabAsset(strategyId, tabId);
        setTabs((prev) =>
          prev.map((t) => (t.id === tabId ? { ...t, asset: null } : t))
        );
        toast.success("Attachment removed");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Remove failed");
      }
    });
  };

  return (
    <Card className="border-border/80">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Backtest documentation</CardTitle>
        <p className="text-xs text-muted-foreground">
          One tab per NinjaTrader-style view (Analysis, Monthly, Summary, Parameters,
          Performance). Attach a screenshot or file and add notes.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue={tabs[0]?.id ?? "analysis"} className="w-full">
          <TabsList className="flex h-auto min-h-9 w-full flex-wrap justify-start gap-1">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="font-mono text-xs"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((t) => (
            <TabsContent key={t.id} value={t.id} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`label-${t.id}`}>Tab title</Label>
                <Input
                  id={`label-${t.id}`}
                  value={t.label}
                  onChange={(e) =>
                    setTabs((prev) =>
                      prev.map((x) =>
                        x.id === t.id ? { ...x, label: e.target.value } : x
                      )
                    )
                  }
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`ex-${t.id}`}>Explanation / notes</Label>
                <Textarea
                  id={`ex-${t.id}`}
                  value={t.explanation}
                  onChange={(e) =>
                    setTabs((prev) =>
                      prev.map((x) =>
                        x.id === t.id ? { ...x, explanation: e.target.value } : x
                      )
                    )
                  }
                  rows={5}
                  placeholder="What this screenshot or export shows; timezone notes (e.g. UTC+1), filters used…"
                  className="text-sm"
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Attachment (image or file — one per tab)
                </p>
                {t.asset ? (
                  <div className="space-y-3">
                    {t.asset.kind === "image" ? (
                      <div className="overflow-hidden rounded-md border border-border bg-background">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={assetUrl(
                            strategyId,
                            t.asset.storagePath,
                            t.asset.mimeType,
                            true
                          )}
                          alt={t.asset.fileName}
                          className="max-h-80 w-full object-contain"
                        />
                      </div>
                    ) : (
                      <a
                        href={assetUrl(
                          strategyId,
                          t.asset.storagePath,
                          t.asset.mimeType,
                          false
                        )}
                        className="inline-flex items-center gap-2 font-mono text-xs text-primary underline-offset-4 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileIcon className="h-4 w-4" />
                        {t.asset.fileName}
                      </a>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingTab === t.id || pending}
                        onClick={() => onRemoveAsset(t.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove attachment
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs hover:bg-muted/50">
                      <Upload className="h-4 w-4" />
                      {uploadingTab === t.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        "Choose file"
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.csv,.txt,.zip,.xml"
                        disabled={uploadingTab === t.id || pending}
                        onChange={(e) => {
                          onUpload(t.id, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      PNG/JPG/PDF/etc. Max 50MB. Upload saves immediately.
                    </span>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end border-t border-border pt-4">
          <Button type="button" disabled={pending} onClick={saveText}>
            {pending && uploadingTab === null ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save text &amp; titles
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
