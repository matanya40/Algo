"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KpiCard, type KpiTone } from "@/components/strategy/analytics/kpi-card";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/strategy-helpers";

export type AccountOverviewRow = {
  id: string;
  connection_id: string;
  external_account_name: string | null;
  external_account_id: string;
  environment: string;
  balance: string | number | null;
  net_pnl: string | number | null;
  unrealized_pnl: string | number | null;
  open_positions_count: number;
  total_fills_count: number;
  last_synced_at: string | null;
  broker_connections: {
    display_name: string;
    is_active: boolean;
    last_status: string | null;
    last_sync_at: string | null;
    deleted_at: string | null;
  } | null;
};

function n(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function toneFor(nv: number): KpiTone {
  if (nv > 0) return "positive";
  if (nv < 0) return "negative";
  return "neutral";
}

export function TradovateAccountsOverview({
  initialRows,
  initialKpis,
}: {
  initialRows: AccountOverviewRow[];
  initialKpis: {
    totalAccounts: number;
    connectedConnections: number;
    failedConnections: number;
    totalBalance: number;
    totalPnl: number;
    totalOpenPositions: number;
  };
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [kpis, setKpis] = useState(initialKpis);

  useEffect(() => {
    setRows(initialRows);
    setKpis(initialKpis);
  }, [initialRows, initialKpis]);

  async function refresh() {
    const res = await fetch("/api/tradovate/accounts");
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to refresh");
      return;
    }
    const list = (json.data ?? []) as AccountOverviewRow[];
    setRows(list);

    const byConn = new Map<
      string,
      { deleted: boolean; active: boolean; status: string | null }
    >();
    for (const r of list) {
      const c = r.broker_connections;
      if (!c) continue;
      byConn.set(r.connection_id, {
        deleted: !!c.deleted_at,
        active: c.is_active,
        status: c.last_status,
      });
    }
    let connectedConnections = 0;
    let failedConnections = 0;
    for (const v of byConn.values()) {
      if (v.deleted || !v.active) continue;
      if (v.status === "failed") failedConnections += 1;
      else connectedConnections += 1;
    }

    const totalBalance = list.reduce((s, r) => s + n(r.balance), 0);
    const totalPnl = list.reduce((s, r) => s + n(r.net_pnl), 0);
    const totalOpenPositions = list.reduce((s, r) => s + (r.open_positions_count ?? 0), 0);
    setKpis({
      totalAccounts: list.length,
      connectedConnections,
      failedConnections,
      totalBalance,
      totalPnl,
      totalOpenPositions,
    });
    router.refresh();
  }

  const visible = rows.filter((r) => r.broker_connections && !r.broker_connections.deleted_at);

  if (visible.length === 0) {
    return (
      <div className="space-y-6">
        <KpiStrip kpis={kpis} />
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No trading accounts synced yet.{" "}
          <Link href="/dashboard/broker-connections" className="text-primary underline">
            Add a Tradovate connection
          </Link>{" "}
          and run <span className="font-mono">Sync</span>.
        </div>
        <Button type="button" variant="secondary" onClick={() => void refresh()}>
          Refresh from database
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <KpiStrip kpis={kpis} />
        <Button type="button" variant="secondary" size="sm" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 font-mono text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Connection</th>
              <th className="px-3 py-2">Env</th>
              <th className="px-3 py-2">Balance</th>
              <th className="px-3 py-2">Net PnL</th>
              <th className="px-3 py-2">Unreal</th>
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2">Fills</th>
              <th className="px-3 py-2">Last sync</th>
              <th className="px-3 py-2 text-right"> </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-b border-border/80">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.external_account_name ?? "—"}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.external_account_id}</div>
                </td>
                <td className="px-3 py-2">{r.broker_connections?.display_name ?? "—"}</td>
                <td className="px-3 py-2 capitalize">{r.environment}</td>
                <td className="px-3 py-2 tabular-nums">{formatNumber(n(r.balance), 2)}</td>
                <td className={`px-3 py-2 tabular-nums ${n(r.net_pnl) > 0 ? "text-profit" : n(r.net_pnl) < 0 ? "text-loss" : ""}`}>
                  {formatNumber(n(r.net_pnl), 2)}
                </td>
                <td className="px-3 py-2 tabular-nums">{formatNumber(n(r.unrealized_pnl), 2)}</td>
                <td className="px-3 py-2 tabular-nums">{r.open_positions_count}</td>
                <td className="px-3 py-2 tabular-nums">{r.total_fills_count}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {r.last_synced_at ? new Date(r.last_synced_at).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/trading-accounts/${r.id}`}>View</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiStrip({
  kpis,
}: {
  kpis: {
    totalAccounts: number;
    connectedConnections: number;
    failedConnections: number;
    totalBalance: number;
    totalPnl: number;
    totalOpenPositions: number;
  };
}) {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KpiCard label="Accounts" value={String(kpis.totalAccounts)} tone="neutral" />
      <KpiCard label="Connected (est.)" value={String(kpis.connectedConnections)} tone="neutral" />
      <KpiCard label="Failed sync (est.)" value={String(kpis.failedConnections)} tone="negative" />
      <KpiCard label="Total balance" value={formatNumber(kpis.totalBalance, 2)} tone="neutral" />
      <KpiCard
        label="Total net PnL"
        value={formatNumber(kpis.totalPnl, 2)}
        tone={toneFor(kpis.totalPnl)}
      />
      <KpiCard label="Open positions" value={String(kpis.totalOpenPositions)} tone="neutral" />
    </div>
  );
}
