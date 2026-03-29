import { TradovateAccountsOverview } from "@/components/tradovate/tradovate-accounts-overview";
import type { AccountOverviewRow } from "@/components/tradovate/tradovate-accounts-overview";
import { createClient } from "@/lib/supabase/server";

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function computeKpis(rows: AccountOverviewRow[]) {
  const byConn = new Map<
    string,
    { deleted: boolean; active: boolean; status: string | null }
  >();
  for (const r of rows) {
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
  return {
    totalAccounts: rows.length,
    connectedConnections,
    failedConnections,
    totalBalance: rows.reduce((s, r) => s + num(r.balance), 0),
    totalPnl: rows.reduce((s, r) => s + num(r.net_pnl), 0),
    totalOpenPositions: rows.reduce((s, r) => s + (r.open_positions_count ?? 0), 0),
  };
}

export default async function TradingAccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("trading_accounts")
    .select(
      `
      id,
      connection_id,
      external_account_name,
      external_account_id,
      environment,
      balance,
      net_pnl,
      unrealized_pnl,
      open_positions_count,
      total_fills_count,
      last_synced_at,
      broker_connections (
        display_name,
        is_active,
        last_status,
        last_sync_at,
        deleted_at
      )
    `
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  const rows = (data ?? []).map((r) => {
    const bc = r.broker_connections as AccountOverviewRow["broker_connections"] | AccountOverviewRow["broker_connections"][] | null;
    const broker_connections = Array.isArray(bc) ? bc[0] ?? null : bc;
    return { ...r, broker_connections } as AccountOverviewRow;
  });
  const kpis = computeKpis(rows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">Trading accounts</h1>
        <p className="text-sm text-muted-foreground">
          Data is loaded from Supabase after you sync a Tradovate connection.
        </p>
      </div>

      <TradovateAccountsOverview initialRows={rows} initialKpis={kpis} />
    </div>
  );
}
