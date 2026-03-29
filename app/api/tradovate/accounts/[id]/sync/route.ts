import { NextResponse } from "next/server";
import { requireUserSupabase } from "@/lib/tradovate/api-helpers";
import { syncBrokerConnection } from "@/lib/tradovate/sync";
import type { BrokerConnectionRow } from "@/lib/tradovate/types";

type Ctx = { params: Promise<{ id: string }> };

/** Syncs the parent Tradovate connection for this trading account (full connection sync). */
export async function POST(_req: Request, ctx: Ctx) {
  const r = await requireUserSupabase();
  if ("error" in r) return r.error;

  const { id } = await ctx.params;

  const { data: acc, error: accErr } = await r.supabase
    .from("trading_accounts")
    .select("connection_id")
    .eq("id", id)
    .eq("user_id", r.user.id)
    .maybeSingle();

  if (accErr) {
    return NextResponse.json({ error: accErr.message }, { status: 500 });
  }
  if (!acc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: conn, error: connErr } = await r.supabase
    .from("broker_connections")
    .select("*")
    .eq("id", acc.connection_id)
    .eq("user_id", r.user.id)
    .maybeSingle();

  if (connErr) {
    return NextResponse.json({ error: connErr.message }, { status: 500 });
  }
  if (!conn) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const b = conn as BrokerConnectionRow;
  if (!b.is_active) {
    return NextResponse.json(
      { error: "Connection is disabled. Enable it before syncing." },
      { status: 400 }
    );
  }

  await r.supabase
    .from("broker_connections")
    .update({ last_status: "syncing", last_error: null })
    .eq("id", b.id)
    .eq("user_id", r.user.id);

  const result = await syncBrokerConnection(r.supabase, b);

  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: result.message },
      { status: 200 }
    );
  }

  return NextResponse.json({ success: true, message: "Sync completed." });
}
