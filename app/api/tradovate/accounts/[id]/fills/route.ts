import { NextRequest, NextResponse } from "next/server";
import { requireUserSupabase } from "@/lib/tradovate/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const r = await requireUserSupabase();
  if ("error" in r) return r.error;

  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "25") || 25));
  const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { count, error: countErr } = await r.supabase
    .from("account_fills")
    .select("id", { count: "exact", head: true })
    .eq("trading_account_id", id)
    .eq("user_id", r.user.id);

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  const { data, error } = await r.supabase
    .from("account_fills")
    .select(
      "id, external_fill_id, symbol, side, qty, price, commission, realized_pnl, fill_timestamp, created_at"
    )
    .eq("trading_account_id", id)
    .eq("user_id", r.user.id)
    .order("fill_timestamp", { ascending: sort === "asc" })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
  });
}
