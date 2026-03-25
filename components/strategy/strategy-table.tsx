import Link from "next/link";
import { StatusBadge } from "@/components/strategy/status-badge";
import {
  formatNumber,
  formatPercent,
  getMetrics,
  profitClass,
} from "@/lib/strategy-helpers";
import type { StrategyWithMetrics } from "@/lib/types";

export function StrategyTable({ rows }: { rows: StrategyWithMetrics[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Market</th>
            <th className="px-4 py-3 font-medium">Timeframe</th>
            <th className="px-4 py-3 font-medium text-right">Win rate</th>
            <th className="px-4 py-3 font-medium text-right">Net P&amp;L</th>
            <th className="px-4 py-3 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const m = getMetrics(row);
            const wr = m?.win_rate ?? null;
            const net = m?.net_profit ?? null;
            return (
              <tr
                key={row.id}
                className="border-b border-border/80 transition-colors hover:bg-surface/80"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/strategies/${row.id}`}
                    className="font-mono font-medium hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.market ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">
                  {row.timeframe ?? "—"}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${profitClass(wr ?? undefined)}`}
                >
                  {formatPercent(wr)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${profitClass(net)}`}
                >
                  {formatNumber(net)}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(row.updated_at).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
