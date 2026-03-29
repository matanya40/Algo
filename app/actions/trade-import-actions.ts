"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clarifySupabaseTableError } from "@/lib/supabase/db-errors";
import { assertStrategyOwner } from "@/lib/strategy-file-upload";
import { parseTradesCsv } from "@/lib/trades-csv";

const MAX_CSV_BYTES = 4 * 1024 * 1024;
const CHUNK = 250;

export async function importTradesCsv(
  strategyId: string,
  formData: FormData
): Promise<
  { ok: true; inserted: number } | { ok: false; error: string }
> {
  const supabase = await createClient();
  try {
    await assertStrategyOwner(supabase, strategyId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    if (msg === "Unauthorized") {
      return { ok: false, error: "You must be signed in." };
    }
    if (msg === "Not found") {
      return { ok: false, error: "Strategy not found." };
    }
    return { ok: false, error: msg };
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, error: "Choose a CSV file." };
  }
  if (file.size > MAX_CSV_BYTES) {
    return { ok: false, error: "File too large (max 4 MB)." };
  }

  const replace =
    formData.get("replace") === "true" || formData.get("replace") === "on";

  const text = await file.text();
  const parsed = parseTradesCsv(text);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  if (replace) {
    const { error: delErr } = await supabase
      .from("trades")
      .delete()
      .eq("strategy_id", strategyId);
    if (delErr) {
      return {
        ok: false,
        error: clarifySupabaseTableError(delErr.message),
      };
    }
  }

  const rows = parsed.rows.map((r) => ({
    strategy_id: strategyId,
    pnl: r.pnl,
    created_at: r.created_at,
  }));

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error: insErr } = await supabase.from("trades").insert(chunk);
    if (insErr) {
      return {
        ok: false,
        error: clarifySupabaseTableError(insErr.message),
      };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/strategies/${strategyId}`);
  revalidatePath(`/strategies/${strategyId}/analytics`);

  return { ok: true, inserted: rows.length };
}
