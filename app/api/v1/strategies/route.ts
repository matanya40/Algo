import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StrategyWithMetrics } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";

  let ownedQuery = supabase
    .from("strategies")
    .select("*, strategy_metrics(*)")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (q) {
    ownedQuery = ownedQuery.ilike("name", `%${q}%`);
  }
  if (status && status !== "all") {
    ownedQuery = ownedQuery.eq("status", status);
  }

  const { data: owned, error: ownedErr } = await ownedQuery;
  if (ownedErr) {
    return NextResponse.json({ error: ownedErr.message }, { status: 500 });
  }

  const { data: shareRows, error: shareErr } = await supabase
    .from("strategy_shares")
    .select("strategies(*, strategy_metrics(*))")
    .eq("user_id", user.id);

  if (shareErr) {
    return NextResponse.json({ error: shareErr.message }, { status: 500 });
  }

  const shared = (shareRows ?? [])
    .map((r) => r.strategies as unknown as StrategyWithMetrics | null)
    .filter((s): s is StrategyWithMetrics => s != null);

  const byId = new Map<string, StrategyWithMetrics>();
  for (const s of (owned ?? []) as StrategyWithMetrics[]) {
    byId.set(s.id, s);
  }
  for (const s of shared) {
    if (!byId.has(s.id)) byId.set(s.id, s);
  }

  let merged = [...byId.values()].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  if (q) {
    const qq = q.toLowerCase();
    merged = merged.filter((s) => s.name.toLowerCase().includes(qq));
  }
  if (status && status !== "all") {
    merged = merged.filter((s) => s.status === status);
  }

  return NextResponse.json({ data: merged });
}
