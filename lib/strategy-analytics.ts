import type {
  StrategyAnalyticsSnapshot,
  StrategyMetricsRow,
  TradeRow,
} from "@/lib/types";

function toNumber(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? x : 0;
}

function utcDayKey(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function startOfWeekUtcMonday(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function spanDaysUtc(trades: TradeRow[]): number {
  if (trades.length === 0) return 0;
  const sorted = [...trades].sort(
    (a, b) => +new Date(a.created_at) - +new Date(b.created_at)
  );
  const first = +new Date(sorted[0].created_at);
  const last = +new Date(sorted[sorted.length - 1].created_at);
  return Math.max(1, Math.ceil((last - first) / 86_400_000));
}

function addWeeksUtcMonday(baseMondayYmd: string, weekDelta: number): string {
  const [y, mo, d] = baseMondayYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + weekDelta * 7);
  return dt.toISOString().slice(0, 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export type SyntheticChartSeries = {
  equityCurve: { date: string; equity: number }[];
  drawdownSeries: { date: string; drawdown: number }[];
  tradesOverTime: { label: string; count: number }[];
  tradesOverTimeGranularity: "week";
};

/** True when stored metrics are enough to render illustrative weekly charts (no imported trades). */
export function metricsSupportDemoCharts(m: StrategyMetricsRow): boolean {
  const tt = m.total_trades ?? 0;
  if (tt > 0) return true;
  const np = m.net_profit;
  if (np != null && np !== 0) return true;
  const md = m.max_drawdown;
  if (md != null && md !== 0) return true;
  return false;
}

/**
 * Synthetic weekly series: equity ends at net_profit, drawdown reaches scaled max_drawdown,
 * trade counts per week sum to total_trades.
 */
export function buildSyntheticChartSeries(
  m: StrategyMetricsRow
): SyntheticChartSeries {
  const totalTrades = Math.max(0, m.total_trades ?? 0);
  const netProfit = m.net_profit ?? 0;
  const mdRaw = m.max_drawdown ?? 0;
  const mdMag = mdRaw <= 0 ? -mdRaw : mdRaw;
  const peakEquity = mdMag > 0 ? netProfit + mdMag : netProfit;

  const W = Math.max(
    4,
    Math.min(52, totalTrades > 0 ? Math.ceil(totalTrades / 2) : 8)
  );

  const endMonday = startOfWeekUtcMonday(m.updated_at);
  const weekLabels: string[] = [];
  for (let i = 0; i < W; i++) {
    weekLabels.push(addWeeksUtcMonday(endMonday, i - (W - 1)));
  }

  const peakIdx = Math.min(W - 2, Math.max(1, Math.floor((W - 1) * 0.4)));

  const equityCurve: { date: string; equity: number }[] = [];
  for (let i = 0; i < W; i++) {
    const tUp = peakIdx > 0 ? i / peakIdx : 1;
    const tDown =
      W - 1 - peakIdx > 0 ? (i - peakIdx) / (W - 1 - peakIdx) : 1;
    let equity: number;
    if (i <= peakIdx) {
      equity = lerp(0, peakEquity, Math.min(1, tUp));
    } else {
      equity = lerp(peakEquity, netProfit, Math.min(1, Math.max(0, tDown)));
    }
    equityCurve.push({ date: weekLabels[i], equity });
  }

  let peak = -Infinity;
  const drawdownSeries: { date: string; drawdown: number }[] = [];
  for (const pt of equityCurve) {
    if (pt.equity > peak) peak = pt.equity;
    drawdownSeries.push({ date: pt.date, drawdown: pt.equity - peak });
  }

  const counts = new Array(W).fill(0);
  const base = Math.floor(totalTrades / W);
  const rem = totalTrades % W;
  for (let i = 0; i < W; i++) {
    counts[i] = base + (i < rem ? 1 : 0);
  }

  const tradesOverTime = weekLabels.map((label, i) => ({
    label,
    count: counts[i]!,
  }));

  return {
    equityCurve,
    drawdownSeries,
    tradesOverTime,
    tradesOverTimeGranularity: "week",
  };
}

export function computeStrategyAnalytics(
  trades: TradeRow[],
  /** When there are no imported trades, fill KPIs / summary from `strategy_metrics` (same as strategy detail page). */
  storedMetrics?: StrategyMetricsRow | null
): StrategyAnalyticsSnapshot {
  const sorted = [...trades].sort(
    (a, b) => +new Date(a.created_at) - +new Date(b.created_at)
  );

  let netProfit = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let winningTrades = 0;
  let losingTrades = 0;

  for (const t of sorted) {
    const pnl = toNumber(t.pnl);
    netProfit += pnl;
    if (pnl > 0) {
      winningTrades += 1;
      grossProfit += pnl;
    } else if (pnl < 0) {
      losingTrades += 1;
      grossLoss += pnl;
    }
  }

  const totalTrades = sorted.length;
  const winRate =
    totalTrades > 0 ? (winningTrades / totalTrades) * 100 : null;

  const profitFactor =
    grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : null;

  const dailyPnl = new Map<string, number>();
  for (const t of sorted) {
    const day = utcDayKey(t.created_at);
    const pnl = toNumber(t.pnl);
    dailyPnl.set(day, (dailyPnl.get(day) ?? 0) + pnl);
  }

  const days = [...dailyPnl.keys()].sort();
  let cum = 0;
  const equityCurve: { date: string; equity: number }[] = [];
  for (const d of days) {
    cum += dailyPnl.get(d)!;
    equityCurve.push({ date: d, equity: cum });
  }

  let peak = -Infinity;
  let maxDrawdown = 0;
  const drawdownSeries: { date: string; drawdown: number }[] = [];
  for (const pt of equityCurve) {
    if (pt.equity > peak) peak = pt.equity;
    const dd = pt.equity - peak;
    drawdownSeries.push({ date: pt.date, drawdown: dd });
    if (dd < maxDrawdown) maxDrawdown = dd;
  }

  const useWeekly = spanDaysUtc(sorted) > 60;
  const tradesOverTimeGranularity: "day" | "week" = useWeekly
    ? "week"
    : "day";
  const bucket = new Map<string, number>();
  for (const t of sorted) {
    const key = useWeekly
      ? startOfWeekUtcMonday(t.created_at)
      : utcDayKey(t.created_at);
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
  }
  const periods = [...bucket.keys()].sort();
  const tradesOverTime = periods.map((label) => ({
    label,
    count: bucket.get(label)!,
  }));

  const avgTrade = totalTrades > 0 ? netProfit / totalTrades : 0;

  const importedTradeCount = sorted.length;

  const base: StrategyAnalyticsSnapshot = {
    chartDemoMode: false,
    importedTradeCount,
    kpis: {
      winRate,
      netProfit,
      profitFactor,
      maxDrawdown,
    },
    equityCurve,
    drawdownSeries,
    winLoss: { wins: winningTrades, losses: losingTrades },
    tradesOverTime,
    tradesOverTimeGranularity,
    summary: {
      avgTrade,
      totalTrades,
      winningTrades,
      losingTrades,
    },
  };

  if (importedTradeCount === 0 && storedMetrics) {
    const m = storedMetrics;
    const demo = metricsSupportDemoCharts(m);
    const charts = demo ? buildSyntheticChartSeries(m) : null;
    return {
      ...base,
      chartDemoMode: demo,
      importedTradeCount: 0,
      kpis: {
        winRate: m.win_rate,
        netProfit: m.net_profit ?? 0,
        profitFactor: m.profit_factor,
        maxDrawdown: m.max_drawdown ?? 0,
      },
      winLoss: {
        wins: m.winning_trades ?? 0,
        losses: m.losing_trades ?? 0,
      },
      summary: {
        avgTrade: m.average_trade ?? 0,
        totalTrades: m.total_trades ?? 0,
        winningTrades: m.winning_trades ?? 0,
        losingTrades: m.losing_trades ?? 0,
      },
      ...(charts
        ? {
            equityCurve: charts.equityCurve,
            drawdownSeries: charts.drawdownSeries,
            tradesOverTime: charts.tradesOverTime,
            tradesOverTimeGranularity: charts.tradesOverTimeGranularity,
          }
        : {}),
    };
  }

  return base;
}
