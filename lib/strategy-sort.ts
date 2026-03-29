import { getMetrics } from "@/lib/strategy-helpers";
import type { StrategyWithMetrics } from "@/lib/types";

export type StrategySortKey =
  | "name"
  | "status"
  | "market"
  | "timeframe"
  | "winRate"
  | "netProfit"
  | "updated";

export type SortDir = "asc" | "desc";

/** First click direction when switching to this column. */
export function defaultSortDir(key: StrategySortKey): SortDir {
  if (key === "winRate" || key === "netProfit" || key === "updated") {
    return "desc";
  }
  return "asc";
}

/** Null / missing metrics sort after real numbers. */
function cmpNullableNumber(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

export function sortStrategies(
  rows: StrategyWithMetrics[],
  key: StrategySortKey,
  dir: SortDir
): StrategyWithMetrics[] {
  const mult = dir === "asc" ? 1 : -1;
  const copy = [...rows];
  copy.sort((a, b) => {
    let cmp = 0;
    const ma = getMetrics(a);
    const mb = getMetrics(b);
    switch (key) {
      case "name":
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "market":
        cmp = (a.market ?? "").localeCompare(b.market ?? "", undefined, {
          sensitivity: "base",
        });
        break;
      case "timeframe":
        cmp = (a.timeframe ?? "").localeCompare(b.timeframe ?? "", undefined, {
          sensitivity: "base",
        });
        break;
      case "winRate":
        cmp = cmpNullableNumber(ma?.win_rate ?? null, mb?.win_rate ?? null);
        break;
      case "netProfit":
        cmp = cmpNullableNumber(ma?.net_profit ?? null, mb?.net_profit ?? null);
        break;
      case "updated":
        cmp =
          new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        break;
      default:
        cmp = 0;
    }
    return cmp * mult;
  });
  return copy;
}
