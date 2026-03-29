"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard, type KpiTone } from "@/components/strategy/analytics/kpi-card";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPercent } from "@/lib/strategy-helpers";

type Stats = {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  net_profit: string | number;
  win_rate: string | number;
  avg_win: string | number;
  avg_loss: string | number;
  max_drawdown: string | number;
} | null;

type Header = {
  id: string;
  external_account_name: string | null;
  external_account_id: string;
  environment: string;
  balance: string | number | null;
  net_pnl: string | number | null;
  unrealized_pnl: string | number | null;
  open_positions_count: number;
  total_fills_count: number;
  last_synced_at: string | null;
  broker_connections: { display_name: string; last_sync_at: string | null } | null;
};

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function tone(nv: number): KpiTone {
  if (nv > 0) return "positive";
  if (nv < 0) return "negative";
  return "neutral";
}

export function pickStats(raw: unknown): Stats {
  if (!raw) return null;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  return {
    total_trades: Number(o.total_trades ?? 0),
    winning_trades: Number(o.winning_trades ?? 0),
    losing_trades: Number(o.losing_trades ?? 0),
    net_profit: (o.net_profit as string | number) ?? 0,
    win_rate: (o.win_rate as string | number) ?? 0,
    avg_win: (o.avg_win as string | number) ?? 0,
    avg_loss: (o.avg_loss as string | number) ?? 0,
    max_drawdown: (o.max_drawdown as string | number) ?? 0,
  };
}

export function TradovateAccountDetail({
  accountId,
  initialHeader,
  initialStats,
}: {
  accountId: string;
  initialHeader: Header;
  initialStats: Stats;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [fills, setFills] = useState<
    {
      id: string;
      symbol: string | null;
      side: string | null;
      qty: string | number | null;
      price: string | number | null;
      realized_pnl: string | number | null;
      fill_timestamp: string | null;
    }[]
  >([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [equity, setEquity] = useState<{ t: string; v: number }[]>([]);
  const [daily, setDaily] = useState<{ day: string; v: number }[]>([]);

  const loadFills = useCallback(async (p: number) => {
    const res = await fetch(
      `/api/tradovate/accounts/${accountId}/fills?page=${p}&pageSize=20&sort=desc`
    );
    const json = await res.json();
    if (res.ok) {
      setFills(json.data ?? []);
      setTotal(json.total ?? 0);
      setPage(json.page ?? p);
    }
  }, [accountId]);

  const loadCurves = useCallback(async () => {
    const res = await fetch(`/api/tradovate/accounts/${accountId}/curve`);
    const json = await res.json();
    if (res.ok) {
      const eq = (json.equityCurve ?? []) as { t: string; v: number }[];
      const dy = (json.dailyPnlCurve ?? []) as { day: string; v: number }[];
      setEquity(Array.isArray(eq) ? eq : []);
      setDaily(Array.isArray(dy) ? dy : []);
    }
  }, [accountId]);

  useEffect(() => {
    void loadFills(1);
    void loadCurves();
  }, [loadFills, loadCurves]);

  async function syncAccount() {
    setBusy(true);
    try {
      const res = await fetch(`/api/tradovate/accounts/${accountId}/sync`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message ?? "Synced");
      } else {
        toast.error(json.message ?? "Sync failed");
      }
      router.refresh();
      await loadFills(1);
      await loadCurves();
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  const st = initialStats;
  const chartData = equity.map((p) => ({
    label: p.t.slice(0, 10),
    v: p.v,
  }));
  const dailyChart = daily.map((p) => ({
    label: p.day,
    v: p.v,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="w-fit" asChild>
            <Link href="/dashboard/trading-accounts">← Trading accounts</Link>
          </Button>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            {initialHeader.external_account_name ?? "Trading account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{initialHeader.external_account_id}</span>
            <span className="mx-2">·</span>
            <span className="capitalize">{initialHeader.environment}</span>
            {initialHeader.broker_connections ? (
              <>
                <span className="mx-2">·</span>
                {initialHeader.broker_connections.display_name}
              </>
            ) : null}
          </p>
        </div>
        <Button type="button" disabled={busy} onClick={() => void syncAccount()}>
          {busy ? "Syncing…" : "Refresh via connection"}
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <KpiCard label="Balance" value={formatNumber(num(initialHeader.balance), 2)} tone="neutral" />
        <KpiCard
          label="Net PnL (account)"
          value={formatNumber(num(initialHeader.net_pnl), 2)}
          tone={tone(num(initialHeader.net_pnl))}
        />
        <KpiCard
          label="Unrealized"
          value={formatNumber(num(initialHeader.unrealized_pnl), 2)}
          tone={tone(num(initialHeader.unrealized_pnl))}
        />
        <KpiCard
          label="Open positions"
          value={String(initialHeader.open_positions_count)}
          tone="neutral"
        />
      </section>

      {st ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total trades" value={String(st.total_trades)} tone="neutral" />
          <KpiCard
            label="Win rate"
            value={formatPercent(num(st.win_rate))}
            tone={
              num(st.win_rate) > 50
                ? "positive"
                : num(st.win_rate) < 50
                  ? "negative"
                  : "neutral"
            }
          />
          <KpiCard label="Avg win" value={formatNumber(num(st.avg_win), 2)} tone="positive" />
          <KpiCard label="Avg loss" value={formatNumber(num(st.avg_loss), 2)} tone="negative" />
          <KpiCard
            label="Net (fills)"
            value={formatNumber(num(st.net_profit), 2)}
            tone={tone(num(st.net_profit))}
          />
          <KpiCard
            label="Max drawdown"
            value={formatNumber(num(st.max_drawdown), 2)}
            tone="negative"
          />
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <h2 className="mb-3 font-mono text-sm font-semibold text-muted-foreground">
            Cumulative PnL (from synced fills)
          </h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Run sync after fills exist to build the curve.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <h2 className="mb-3 font-mono text-sm font-semibold text-muted-foreground">Daily PnL</h2>
          {dailyChart.length === 0 ? (
            <p className="text-sm text-muted-foreground">No daily breakdown yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="v" stroke="hsl(var(--profit))" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3 font-mono text-sm font-semibold">
          Fills ({total})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted/40 font-mono text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Side</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">PnL</th>
              </tr>
            </thead>
            <tbody>
              {fills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    No fills in this page.
                  </td>
                </tr>
              ) : (
                fills.map((f) => (
                  <tr key={f.id} className="border-t border-border/80">
                    <td className="px-3 py-2 text-muted-foreground">
                      {f.fill_timestamp
                        ? new Date(f.fill_timestamp).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{f.symbol ?? "—"}</td>
                    <td className="px-3 py-2">{f.side ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{formatNumber(num(f.qty), 4)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatNumber(num(f.price), 4)}</td>
                    <td className={`px-3 py-2 tabular-nums ${num(f.realized_pnl) >= 0 ? "text-profit" : "text-loss"}`}>
                      {formatNumber(num(f.realized_pnl), 2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => void loadFills(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} · {total} rows
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page * 20 >= total}
            onClick={() => void loadFills(page + 1)}
          >
            Next
          </Button>
        </div>
      </section>
    </div>
  );
}
