"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clarifySupabaseTableError } from "@/lib/supabase/db-errors";

/** Clone a row from `strategy_templates` into the current user's vault (RPC). */
export async function cloneStrategyFromTemplate(
  slug: string
): Promise<{ ok: true; id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase.rpc("clone_strategy_from_template", {
    p_slug: slug,
  });

  if (error) {
    throw new Error(clarifySupabaseTableError(error.message));
  }
  const id = data as string | null;
  if (!id) throw new Error("Clone failed");

  revalidatePath("/dashboard");
  revalidatePath(`/strategies/${id}`);
  return { ok: true, id };
}

/** Same catalog row as clone, but template_slug is null so you can add unlimited copies. */
export async function cloneStrategyFromTemplateExtra(
  slug: string
): Promise<{ ok: true; id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase.rpc(
    "clone_strategy_from_template_extra",
    {
      p_slug: slug,
    }
  );

  if (error) {
    throw new Error(clarifySupabaseTableError(error.message));
  }
  const id = data as string | null;
  if (!id) throw new Error("Clone failed");

  revalidatePath("/dashboard");
  revalidatePath(`/strategies/${id}`);
  return { ok: true, id };
}
