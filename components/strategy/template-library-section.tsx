"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  cloneStrategyFromTemplate,
  cloneStrategyFromTemplateExtra,
} from "@/app/actions/template-clone-actions";
import type { StrategyTemplateRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink, Loader2 } from "lucide-react";

export function TemplateLibrarySection({
  templates,
}: {
  templates: StrategyTemplateRow[];
}) {
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<"add" | "extra" | null>(null);
  const [, startTransition] = useTransition();

  if (templates.length === 0) return null;

  return (
    <section id="templates" className="space-y-3 scroll-mt-24">
      <div>
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Templates
        </h2>
        <p className="text-sm text-muted-foreground">
          Add a pre-filled strategy from the catalog (one linked copy per template, or
          unlimited unlinked copies). You can edit everything after it is created.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id} className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-mono">{t.name}</CardTitle>
              {t.description ? (
                <CardDescription className="line-clamp-3 text-xs leading-relaxed">
                  {t.description}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 pt-0">
              <Button
                type="button"
                size="sm"
                disabled={pendingSlug === t.slug && pendingMode === "add"}
                onClick={() => {
                  startTransition(async () => {
                    setPendingSlug(t.slug);
                    setPendingMode("add");
                    try {
                      const res = await cloneStrategyFromTemplate(t.slug);
                      toast.success("Strategy added from template");
                      router.push(`/strategies/${res.id}`);
                      router.refresh();
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : "Could not add template"
                      );
                    } finally {
                      setPendingSlug(null);
                      setPendingMode(null);
                    }
                  });
                }}
              >
                {pendingSlug === t.slug && pendingMode === "add" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding…
                  </>
                ) : (
                  "Add to vault"
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pendingSlug === t.slug && pendingMode === "extra"}
                title="Creates another strategy with the same pre-filled fields without linking it to the catalog slot."
                onClick={() => {
                  startTransition(async () => {
                    setPendingSlug(t.slug);
                    setPendingMode("extra");
                    try {
                      const res = await cloneStrategyFromTemplateExtra(t.slug);
                      toast.success("Extra copy added");
                      router.push(`/strategies/${res.id}`);
                      router.refresh();
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : "Could not add copy"
                      );
                    } finally {
                      setPendingSlug(null);
                      setPendingMode(null);
                    }
                  });
                }}
              >
                {pendingSlug === t.slug && pendingMode === "extra" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Copy…
                  </>
                ) : (
                  "Another copy"
                )}
              </Button>
              {t.source_url ? (
                <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
                  <a href={t.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Source
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
