import { NextResponse } from "next/server";
import { requireUserSupabase } from "@/lib/tradovate/api-helpers";

export async function GET() {
  const r = await requireUserSupabase();
  if ("error" in r) return r.error;

  const { data, error } = await r.supabase
    .from("trading_accounts")
    .select(
      `
      *,
      broker_connections!inner (
        id,
        display_name,
        is_active,
        last_status,
        last_error,
        last_sync_at,
        deleted_at
      ),
      account_derived_stats (*)
    `
    )
    .eq("user_id", r.user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filtered = (data ?? []).filter((row) => {
    const conn = row.broker_connections as {
      deleted_at?: string | null;
      is_active?: boolean;
    } | null;
    if (!conn || conn.deleted_at) return false;
    return true;
  });

  return NextResponse.json({ data: filtered });
}
