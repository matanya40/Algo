import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteStrategyButton } from "@/components/strategy/delete-strategy-button";
import { InstallGuideSection } from "@/components/strategy/install-guide-section";
import { MetricCard } from "@/components/strategy/metric-card";
import { StatusBadge } from "@/components/strategy/status-badge";
import { UploadFilesSection } from "@/components/strategy/upload-files-section";
import {
  formatNumber,
  formatPercent,
  getMetrics,
  profitClass,
} from "@/lib/strategy-helpers";
import { createClient } from "@/lib/supabase/server";
import type {
  StrategyFileRow,
  StrategyPageAssetRow,
  StrategyPageWithAssets,
  StrategyWithMetrics,
} from "@/lib/types";
import { StrategyPageReadonly } from "@/components/strategy/strategy-page-readonly";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Pencil } from "lucide-react";

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
    .eq("owner_id", user.id)
    .maybeSingle();

  if (sErr || !strategy) notFound();

  const { data: files } = await supabase
    .from("strategy_files")
    .select("*")
    .eq("strategy_id", id)
    .order("created_at", { ascending: false });

  const fileRows = (files ?? []) as StrategyFileRow[];

  const { data: docPageRaw } = await supabase
    .from("strategy_pages")
    .select("*, strategy_page_assets(*)")
    .eq("strategy_id", id)
    .maybeSingle();

  const docPage = docPageRaw as StrategyPageWithAssets | null;
  const pageAssets = (docPage?.strategy_page_assets ??
    []) as StrategyPageAssetRow[];

  const row = strategy as StrategyWithMetrics;
  const m = getMetrics(row);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {row.name}
            </h1>
            <StatusBadge status={row.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {[row.market, row.instrument, row.timeframe].filter(Boolean).join(" · ") ||
              "No market context"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/strategies/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeleteStrategyButton strategyId={id} />
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

      <section className="space-y-4">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Strategy page
        </h2>
        {docPage ? (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
              <CardTitle className="text-base">{docPage.title}</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/strategies/${id}/edit`}>Edit documentation</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <StrategyPageReadonly contentJson={docPage.content_json} />
              {pageAssets.length > 0 ? (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Page attachments
                  </p>
                  <ul className="space-y-1 font-mono text-sm">
                    {pageAssets.map((a) => (
                      <li key={a.id}>
                        <a
                          href={`/api/strategy-page-asset/${id}/${a.id}`}
                          className="text-primary underline-offset-2 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {a.file_name}
                        </a>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({a.type})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No documentation page yet. This is optional —{" "}
              <Link
                href={`/strategies/${id}/edit`}
                className="text-foreground underline underline-offset-2"
              >
                add one when editing
              </Link>
              .
            </CardContent>
          </Card>
        )}
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

      <UploadFilesSection strategyId={id} files={fileRows} />
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
