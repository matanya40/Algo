import { NextResponse } from "next/server";
import { requireUserSupabase } from "@/lib/tradovate/api-helpers";
import { syncBrokerConnection } from "@/lib/tradovate/sync";
import type { BrokerConnectionRow } from "@/lib/tradovate/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const r = await requireUserSupabase();
  if ("error" in r) return r.error;

  const { id } = await ctx.params;

  const { data: row, error: fetchErr } = await r.supabase
    .from("broker_connections")
    .select("*")
    .eq("id", id)
    .eq("user_id", r.user.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const b = row as BrokerConnectionRow;
  if (!b.is_active) {
    return NextResponse.json(
      { error: "Connection is disabled. Enable it before syncing." },
      { status: 400 }
    );
  }
  if (b.deleted_at) {
    return NextResponse.json({ error: "Connection was removed." }, { status: 400 });
  }

  await r.supabase
    .from("broker_connections")
    .update({ last_status: "syncing", last_error: null })
    .eq("id", id)
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
