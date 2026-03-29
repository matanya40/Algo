import { notFound } from "next/navigation";
import {
  TradovateAccountDetail,
  pickStats,
} from "@/components/tradovate/tradovate-account-detail";
import { createClient } from "@/lib/supabase/server";

export default async function TradingAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      external_account_name,
      external_account_id,
      environment,
      balance,
      net_pnl,
      unrealized_pnl,
      open_positions_count,
      total_fills_count,
      last_synced_at,
      broker_connections ( display_name, last_sync_at ),
      account_derived_stats (*)
    `
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error.message}
      </div>
    );
  }
  if (!data) notFound();

  const bcRaw = data.broker_connections as
    | { display_name: string; last_sync_at: string | null }
    | { display_name: string; last_sync_at: string | null }[]
    | null;
  const broker_connections = Array.isArray(bcRaw) ? bcRaw[0] ?? null : bcRaw;

  const header = {
    id: data.id,
    external_account_name: data.external_account_name,
    external_account_id: data.external_account_id,
    environment: data.environment,
    balance: data.balance,
    net_pnl: data.net_pnl,
    unrealized_pnl: data.unrealized_pnl,
    open_positions_count: data.open_positions_count,
    total_fills_count: data.total_fills_count,
    last_synced_at: data.last_synced_at,
    broker_connections,
  };

  return (
    <TradovateAccountDetail
      accountId={data.id}
      initialHeader={header}
      initialStats={pickStats(data.account_derived_stats)}
    />
  );
}
