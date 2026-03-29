import { notFound } from "next/navigation";
import { StrategyAnalyticsView } from "@/components/strategy/analytics/strategy-analytics-view";
import { computeStrategyAnalytics } from "@/lib/strategy-analytics";
import { getMetrics } from "@/lib/strategy-helpers";
import { createClient } from "@/lib/supabase/server";
import type { StrategyWithMetrics, TradeRow } from "@/lib/types";

export default async function StrategyAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: strategy, error: sErr } = await supabase
    .from("strategies")
    .select("id, name, owner_id, strategy_metrics(*)")
    .eq("id", id)
    .maybeSingle();

  if (sErr || !strategy) notFound();

  const metricsRow = getMetrics(strategy as StrategyWithMetrics);

  const { data: tradesRaw } = await supabase
    .from("trades")
    .select("id, strategy_id, pnl, created_at")
    .eq("strategy_id", id)
    .order("created_at", { ascending: true });

  const trades = (tradesRaw ?? []) as TradeRow[];
  const analytics = computeStrategyAnalytics(trades, metricsRow);

  return (
    <StrategyAnalyticsView
      strategyId={id}
      strategyName={strategy.name}
      analytics={analytics}
    />
  );
}
