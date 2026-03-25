import Link from "next/link";
import { StatusBadge } from "@/components/strategy/status-badge";
import {
  formatNumber,
  formatPercent,
  getMetrics,
  profitClass,
} from "@/lib/strategy-helpers";
import type { StrategyWithMetrics } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function StrategyCard({ row }: { row: StrategyWithMetrics }) {
  const m = getMetrics(row);
  const net = m?.net_profit ?? null;
  const wr = m?.win_rate ?? null;

  return (
    <Link href={`/strategies/${row.id}`}>
      <Card className="h-full border-border bg-card transition-colors hover:border-primary/40">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
          <div className="min-w-0 space-y-1">
            <h3 className="truncate font-mono text-sm font-semibold">{row.name}</h3>
            <p className="text-xs text-muted-foreground">
              {[row.market, row.timeframe].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          <StatusBadge status={row.status} />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 font-mono text-sm">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Win rate</p>
            <p className={profitClass(wr ?? undefined)}>{formatPercent(wr ?? null)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Net P&amp;L</p>
            <p className={profitClass(net)}>{formatNumber(net)}</p>
          </div>
          <div className="col-span-2 text-[10px] text-muted-foreground">
            Updated{" "}
            {new Date(row.updated_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
