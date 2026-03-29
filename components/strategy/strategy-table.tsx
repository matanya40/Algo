"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StrategyCard } from "@/components/strategy/strategy-card";
import { StatusBadge } from "@/components/strategy/status-badge";
import {
  formatNumber,
  formatPercent,
  getMetrics,
  profitClass,
} from "@/lib/strategy-helpers";
import {
  defaultSortDir,
  sortStrategies,
  type SortDir,
  type StrategySortKey,
} from "@/lib/strategy-sort";
import type { StrategyWithMetrics } from "@/lib/types";

function ownerLabel(
  row: StrategyWithMetrics,
  ownerNames: Record<string, string | null>
): string {
  const oid = row.owner_id;
  if (!oid) return "—";
  const name = ownerNames[oid];
  if (name?.trim()) return name.trim();
  return `User ${oid.slice(0, 8)}…`;
}
import { cn } from "@/lib/utils";
import { ImportTradesCsvMenu } from "@/components/strategy/import-trades-csv-menu";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

function SortableTh({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  columnKey: StrategySortKey;
  sortKey: StrategySortKey;
  sortDir: SortDir;
  onSort: (k: StrategySortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === columnKey;
  return (
    <th
      className={cn(
        "px-4 py-3 font-medium",
        align === "right" && "text-right",
        active && "text-foreground"
      )}
      aria-sort={
        active
          ? sortDir === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          "group inline-flex max-w-full items-center gap-1.5 rounded-md px-0.5 py-0.5 hover:bg-muted/60 hover:text-foreground",
          align === "left" && "text-left",
          align === "right" && "w-full justify-end text-right"
        )}
      >
        <span className="truncate">{label}</span>
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          )
        ) : (
          <ArrowUpDown
            className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-70"
            aria-hidden
          />
        )}
      </button>
    </th>
  );
}

export function StrategyTable({
  rows,
  readOnly = false,
  ownerNames,
}: {
  rows: StrategyWithMetrics[];
  /** Hide trade import; optional owner column for shared list. */
  readOnly?: boolean;
  ownerNames?: Record<string, string | null>;
}) {
  const [sortKey, setSortKey] = useState<StrategySortKey>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(
    () => sortStrategies(rows, sortKey, sortDir),
    [rows, sortKey, sortDir]
  );

  function onSort(key: StrategySortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(defaultSortDir(key));
    }
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted-foreground">
              <SortableTh
                label="Name"
                columnKey="name"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                label="Status"
                columnKey="status"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                label="Market"
                columnKey="market"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                label="Timeframe"
                columnKey="timeframe"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                label="Win rate"
                columnKey="winRate"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                align="right"
              />
              <SortableTh
                label="Net P&L"
                columnKey="netProfit"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                align="right"
              />
              <SortableTh
                label="Updated"
                columnKey="updated"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
              {readOnly && ownerNames ? (
                <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">
                  Owner
                </th>
              ) : null}
              {!readOnly ? (
                <th
                  className="px-4 py-3 text-right text-xs uppercase text-muted-foreground"
                  title="Import trades: CSV with a profit column (pnl, profit, …) and optional date / exit time."
                >
                  Trades
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
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
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.market ?? "—"}
                  </td>
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
                  {readOnly && ownerNames ? (
                    <td className="max-w-[140px] truncate px-4 py-3 text-xs text-muted-foreground">
                      {ownerLabel(row, ownerNames)}
                    </td>
                  ) : null}
                  {!readOnly ? (
                    <td className="px-4 py-2 text-right">
                      <ImportTradesCsvMenu strategyId={row.id} compact />
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:hidden">
        {sorted.map((row) => (
          <StrategyCard
            key={row.id}
            row={row}
            readOnly={readOnly}
            ownerLabel={
              readOnly && ownerNames ? ownerLabel(row, ownerNames) : undefined
            }
          />
        ))}
      </div>
    </>
  );
}
