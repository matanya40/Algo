import { NextResponse } from "next/server";
import { requireUserSupabase } from "@/lib/tradovate/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const r = await requireUserSupabase();
  if ("error" in r) return r.error;

  const { id } = await ctx.params;

  const { data, error } = await r.supabase
    .from("trading_accounts")
    .select(
      `
      *,
      broker_connections (
        id,
        display_name,
        environment,
        is_active,
        last_status,
        last_sync_at
      ),
      account_derived_stats (*)
    `
    )
    .eq("id", id)
    .eq("user_id", r.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}
