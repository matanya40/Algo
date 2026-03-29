"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteStrategyStorageAndRow } from "@/app/actions/strategy-delete-core";
import { persistStrategyFilesFromFormData } from "@/app/actions/file-actions";
import { clarifySupabaseTableError } from "@/lib/supabase/db-errors";
import type { StrategyDirection, StrategyStatus } from "@/lib/types";

async function assertStrategyOwner(supabase: Awaited<ReturnType<typeof createClient>>, strategyId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: row, error } = await supabase
    .from("strategies")
    .select("id")
    .eq("id", strategyId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !row) throw new Error("Not found");
  return user;
}

export type StrategyFormState = {
  name: string;
  description: string;
  status: StrategyStatus;
  market: string;
  instrument: string;
  timeframe: string;
  session: string;
  direction: StrategyDirection | "";
  concept: string;
  notes: string;
  installationGuide: string;
};

export type MetricsFormState = {
  winRate: string;
  totalTrades: string;
  winningTrades: string;
  losingTrades: string;
  netProfit: string;
  maxDrawdown: string;
  profitFactor: string;
  averageTrade: string;
};

function parseNum(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

export async function createStrategy(
  form: StrategyFormState,
  metrics: MetricsFormState,
  /** Same request as create — avoids losing `File` blobs on a second server action. */
  filesFormData?: FormData
): Promise<{
  ok: true;
  id: string;
  uploaded: number;
  errors: string[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: strategy, error: e1 } = await supabase
    .from("strategies")
    .insert({
      owner_id: user.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      market: form.market.trim() || null,
      instrument: form.instrument.trim() || null,
      timeframe: form.timeframe.trim() || null,
      session: form.session.trim() || null,
      direction: form.direction || null,
      concept: form.concept.trim() || null,
      notes: form.notes.trim() || null,
      installation_guide: form.installationGuide.trim() || null,
    })
    .select("id")
    .single();

  if (e1 || !strategy) {
    throw new Error(clarifySupabaseTableError(e1?.message ?? "Create failed"));
  }

  const { error: e2 } = await supabase.from("strategy_metrics").insert({
    strategy_id: strategy.id,
    win_rate: parseNum(metrics.winRate),
    total_trades: parseIntOrNull(metrics.totalTrades),
    winning_trades: parseIntOrNull(metrics.winningTrades),
    losing_trades: parseIntOrNull(metrics.losingTrades),
    net_profit: parseNum(metrics.netProfit),
    max_drawdown: parseNum(metrics.maxDrawdown),
    profit_factor: parseNum(metrics.profitFactor),
    average_trade: parseNum(metrics.averageTrade),
  });

  if (e2) throw new Error(clarifySupabaseTableError(e2.message));

  revalidatePath("/dashboard");
  revalidatePath(`/strategies/${strategy.id}`);

  const upload =
    filesFormData != null
      ? await persistStrategyFilesFromFormData(
          supabase,
          strategy.id,
          filesFormData
        )
      : { uploaded: 0, errors: [] as string[] };

  return {
    ok: true,
    id: strategy.id,
    uploaded: upload.uploaded,
    errors: upload.errors,
  };
}

export async function updateStrategy(
  strategyId: string,
  form: StrategyFormState,
  metrics: MetricsFormState
) {
  const supabase = await createClient();
  await assertStrategyOwner(supabase, strategyId);

  const { error: e1 } = await supabase
    .from("strategies")
    .update({
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      market: form.market.trim() || null,
      instrument: form.instrument.trim() || null,
      timeframe: form.timeframe.trim() || null,
      session: form.session.trim() || null,
      direction: form.direction || null,
      concept: form.concept.trim() || null,
      notes: form.notes.trim() || null,
      installation_guide: form.installationGuide.trim() || null,
    })
    .eq("id", strategyId);

  if (e1) throw new Error(clarifySupabaseTableError(e1.message));

  const { error: e2 } = await supabase.from("strategy_metrics").upsert(
    {
      strategy_id: strategyId,
      win_rate: parseNum(metrics.winRate),
      total_trades: parseIntOrNull(metrics.totalTrades),
      winning_trades: parseIntOrNull(metrics.winningTrades),
      losing_trades: parseIntOrNull(metrics.losingTrades),
      net_profit: parseNum(metrics.netProfit),
      max_drawdown: parseNum(metrics.maxDrawdown),
      profit_factor: parseNum(metrics.profitFactor),
      average_trade: parseNum(metrics.averageTrade),
    },
    { onConflict: "strategy_id" }
  );

  if (e2) throw new Error(clarifySupabaseTableError(e2.message));

  revalidatePath("/dashboard");
  revalidatePath(`/strategies/${strategyId}`);
  revalidatePath(`/strategies/${strategyId}/edit`);
}

/** For use from Client Components (caller runs router.push). */
export async function deleteStrategyClient(strategyId: string) {
  await deleteStrategyStorageAndRow(strategyId);
  revalidatePath("/dashboard");
}

/** Duplicate an owned strategy (metrics copied; docs/files are not duplicated). */
export async function duplicateStrategy(strategyId: string): Promise<{ ok: true; id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase.rpc("duplicate_strategy", {
    p_source_id: strategyId,
  });

  if (error) {
    throw new Error(clarifySupabaseTableError(error.message));
  }
  const id = data as string | null;
  if (!id) throw new Error("Duplicate failed");

  revalidatePath("/dashboard");
  revalidatePath(`/strategies/${id}`);
  return { ok: true, id };
}
