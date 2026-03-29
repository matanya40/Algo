import { NextResponse } from "next/server";
import { requireUserSupabase } from "@/lib/tradovate/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const r = await requireUserSupabase();
  if ("error" in r) return r.error;

  const { id } = await ctx.params;

  const { data, error } = await r.supabase
    .from("account_derived_stats")
    .select("equity_curve, daily_pnl_curve, updated_at")
    .eq("trading_account_id", id)
    .eq("user_id", r.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({
      equityCurve: [],
      dailyPnlCurve: [],
      updatedAt: null,
    });
  }

  return NextResponse.json({
    equityCurve: data.equity_curve ?? [],
    dailyPnlCurve: data.daily_pnl_curve ?? [],
    updatedAt: data.updated_at,
  });
}
