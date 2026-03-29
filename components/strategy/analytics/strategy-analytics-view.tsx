import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KpiCard, type KpiTone } from "@/components/strategy/analytics/kpi-card";
import { formatNumber, formatPercent, profitClass } from "@/lib/strategy-helpers";
import type { StrategyAnalyticsSnapshot } from "@/lib/types";
import { Button } from "@/components/ui/button";

function winRateTone(w: number | null): KpiTone {
  if (w === null) return "neutral";
  if (w > 50) return "positive";
  if (w < 50) return "negative";
  return "neutral";
}

function profitFactorDisplay(
  pf: number | null,
  summary: StrategyAnalyticsSnapshot["summary"]
): { text: string; tone: KpiTone } {
  if (pf !== null && Number.isFinite(pf)) {
    const tone: KpiTone =
      pf > 1 ? "positive" : pf < 1 ? "negative" : "neutral";
    return { text: formatNumber(pf, 2), tone };
  }
  if (summary.totalTrades === 0) return { text: "—", tone: "neutral" };
  if (summary.winningTrades > 0 && summary.losingTrades === 0) {
    return { text: "∞", tone: "positive" };
  }
  return { text: "—", tone: "neutral" };
}

function maxDrawdownTone(dd: number): KpiTone {
  if (dd === 0) return "neutral";
  return "negative";
}

type Props = {
  strategyId: string;
  strategyName: string;
  analytics: StrategyAnalyticsSnapshot;
};

export function StrategyAnalyticsView({
  strategyId,
  strategyName,
  analytics,
}: Props) {
  const { kpis, summary } = analytics;
  const pf = profitFactorDisplay(kpis.profitFactor, summary);

  const netTone: KpiTone =
    kpis.netProfit > 0 ? "positive" : kpis.netProfit < 0 ? "negative" : "neutral";

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
            <Link href={`/strategies/${strategyId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to strategy
            </Link>
          </Button>
          <div>
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              Analytics
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{strategyName}</p>
          </div>
        </div>
      </div>

      {analytics.importedTradeCount === 0 && summary.totalTrades > 0 ? (
        <p className="text-xs text-muted-foreground">
          KPIs match the strategy metrics on the detail page. You have no imported trades yet.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Win rate"
          value={kpis.winRate === null ? "—" : formatPercent(kpis.winRate)}
          tone={winRateTone(kpis.winRate)}
        />
        <KpiCard
          label="Net profit"
          value={formatNumber(kpis.netProfit, 2)}
          tone={netTone}
        />
        <KpiCard label="Profit factor" value={pf.text} tone={pf.tone} />
        <KpiCard
          label="Max drawdown"
          value={formatNumber(kpis.maxDrawdown, 2)}
          tone={maxDrawdownTone(kpis.maxDrawdown)}
        />
      </section>

      <section className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-lg backdrop-blur-sm">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Trade summary
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Average trade" value={formatNumber(summary.avgTrade, 2)} valueClass={profitClass(summary.avgTrade)} />
          <Stat label="Total trades" value={String(summary.totalTrades)} />
          <Stat label="Winning trades" value={String(summary.winningTrades)} valueClass="text-emerald-400" />
          <Stat label="Losing trades" value={String(summary.losingTrades)} valueClass="text-rose-400" />
        </dl>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 font-mono text-lg font-semibold tabular-nums ${valueClass ?? ""}`}>
        {value}
      </dd>
    </div>
  );
}
