import type {
  StrategyMetricsRow,
  StrategyWithMetrics,
} from "@/lib/types";

export function getMetrics(
  row: StrategyWithMetrics
): StrategyMetricsRow | null {
  const m = row.strategy_metrics;
  if (!m) return null;
  if (Array.isArray(m)) return m[0] ?? null;
  return m;
}

export function formatNumber(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function profitClass(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "text-muted-foreground";
  if (n > 0) return "text-profit";
  if (n < 0) return "text-loss";
  return "text-muted-foreground";
}
