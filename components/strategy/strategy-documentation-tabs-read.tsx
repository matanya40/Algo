import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StrategyDocTab } from "@/lib/strategy-doc-tabs";
import { FileIcon } from "lucide-react";

function assetUrl(strategyId: string, path: string, mime: string | null, view: boolean) {
  const params = new URLSearchParams();
  params.set("path", path);
  if (view) params.set("view", "1");
  if (mime) params.set("mime", mime);
  return `/api/strategy-doc-asset/${encodeURIComponent(strategyId)}?${params.toString()}`;
}

export function StrategyDocumentationTabsRead({
  strategyId,
  tabs,
}: {
  strategyId: string;
  tabs: StrategyDocTab[];
}) {
  const hasAny = tabs.some(
    (t) =>
      (t.explanation?.trim() ?? "") !== "" ||
      t.asset != null
  );

  if (!hasAny) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Backtest documentation
      </h2>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Screenshots &amp; notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={tabs[0]?.id ?? "analysis"} className="w-full">
            <TabsList className="flex h-auto min-h-9 w-full flex-wrap justify-start gap-1">
              {tabs.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="font-mono text-xs">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((t) => (
              <TabsContent key={t.id} value={t.id} className="mt-4 space-y-4">
                {t.asset ? (
                  t.asset.kind === "image" ? (
                    <div className="overflow-hidden rounded-md border border-border bg-muted/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={assetUrl(
                          strategyId,
                          t.asset.storagePath,
                          t.asset.mimeType,
                          true
                        )}
                        alt={t.asset.fileName}
                        className="max-h-96 w-full object-contain"
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
                      className="inline-flex items-center gap-2 font-mono text-sm text-primary underline-offset-4 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileIcon className="h-4 w-4" />
                      {t.asset.fileName}
                    </a>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">No attachment for this tab.</p>
                )}
                {t.explanation?.trim() ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {t.explanation}
                    </p>
                  </div>
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
