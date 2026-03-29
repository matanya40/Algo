import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteStrategyButton } from "@/components/strategy/delete-strategy-button";
import { DuplicateStrategyButton } from "@/components/strategy/duplicate-strategy-button";
import { InstallGuideSection } from "@/components/strategy/install-guide-section";
import { MetricCard } from "@/components/strategy/metric-card";
import { StatusBadge } from "@/components/strategy/status-badge";
import { StrategyDocumentationTabsRead } from "@/components/strategy/strategy-documentation-tabs-read";
import { StrategyParametersSection } from "@/components/strategy/strategy-parameters-section";
import { UploadFilesSection } from "@/components/strategy/upload-files-section";
import {
  formatNumber,
  formatPercent,
  getMetrics,
  profitClass,
} from "@/lib/strategy-helpers";
import { normalizeDocumentationTabs } from "@/lib/strategy-doc-tabs";
import { createClient } from "@/lib/supabase/server";
import { isStrategyOwner } from "@/lib/strategy-access";
import type { StrategyFileRow, StrategyWithMetrics } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Pencil } from "lucide-react";

export default async function StrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: strategy, error: sErr } = await supabase
    .from("strategies")
    .select("*, strategy_metrics(*)")
    .eq("id", id)
    .maybeSingle();

  if (sErr || !strategy) notFound();

  const canEdit = isStrategyOwner(strategy as StrategyWithMetrics, user.id);

  const { data: files } = await supabase
    .from("strategy_files")
    .select("*")
    .eq("strategy_id", id)
    .order("created_at", { ascending: false });

  const fileRows = (files ?? []) as StrategyFileRow[];

  const row = strategy as StrategyWithMetrics;
  const m = getMetrics(row);
  const docTabs = normalizeDocumentationTabs(
    (row as { documentation_tabs?: unknown }).documentation_tabs
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {row.name}
            </h1>
            <StatusBadge status={row.status} />
            {row.template_slug ? (
              <span className="rounded border border-border bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                template: {row.template_slug}
              </span>
            ) : null}
            {!canEdit ? (
              <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                Shared with you · view only
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {[row.market, row.instrument, row.timeframe].filter(Boolean).join(" · ") ||
              "No market context"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link href={`/strategies/${id}/analytics`}>
              <BarChart3 className="mr-2 h-4 w-4" />
              View Analytics
            </Link>
          </Button>
          {canEdit ? (
            <>
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/strategies/${id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <DuplicateStrategyButton strategyId={id} />
              <DeleteStrategyButton strategyId={id} />
            </>
          ) : null}
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Overview
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {row.description?.trim() || "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 font-mono text-sm">
              <Row label="Session" value={row.session} />
              <Row label="Direction" value={row.direction} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Concept</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {row.concept?.trim() || "—"}
            </p>
          </CardContent>
        </Card>
      </section>

      <StrategyParametersSection
        parametersJson={
          row.parameters_json && typeof row.parameters_json === "object"
            ? (row.parameters_json as Record<string, unknown>)
            : null
        }
      />

      <StrategyDocumentationTabsRead strategyId={id} tabs={docTabs} />

      <Separator />

      <section className="space-y-4">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Win rate"
            value={formatPercent(m?.win_rate ?? null)}
            valueClassName={profitClass(m?.win_rate ?? undefined)}
          />
          <MetricCard
            label="Net profit"
            value={formatNumber(m?.net_profit ?? null)}
            valueClassName={profitClass(m?.net_profit ?? undefined)}
          />
          <MetricCard
            label="Max drawdown"
            value={formatNumber(m?.max_drawdown ?? null)}
            valueClassName="text-loss"
          />
          <MetricCard
            label="Profit factor"
            value={formatNumber(m?.profit_factor ?? null)}
          />
          <MetricCard
            label="Total trades"
            value={m?.total_trades != null ? String(m.total_trades) : "—"}
          />
          <MetricCard
            label="Winning / losing"
            value={
              m?.winning_trades != null && m?.losing_trades != null
                ? `${m.winning_trades} / ${m.losing_trades}`
                : "—"
            }
          />
          <MetricCard
            label="Average trade"
            value={formatNumber(m?.average_trade ?? null)}
            valueClassName={profitClass(m?.average_trade ?? undefined)}
          />
        </div>
      </section>

      <Separator />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {row.notes?.trim() || "No notes."}
            </p>
          </CardContent>
        </Card>
        <InstallGuideSection text={row.installation_guide} />
      </section>

      <UploadFilesSection strategyId={id} files={fileRows} readOnly={!canEdit} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/60 py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value ?? "—"}</span>
    </div>
  );
}
