"use server";

import { revalidatePath } from "next/cache";
import { findUserIdByEmail } from "@/lib/admin/find-user-by-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clarifySupabaseTableError } from "@/lib/supabase/db-errors";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

async function assertStrategyOwnerForShare(strategyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: row, error } = await supabase
    .from("strategies")
    .select("id, owner_id")
    .eq("id", strategyId)
    .maybeSingle();

  if (error || !row || row.owner_id !== user.id) {
    throw new Error("Not found");
  }
  return { supabase, user };
}

export type InviteStrategyResult =
  | { ok: true; kind: "shared" }
  | { ok: true; kind: "invited"; token: string }
  | { ok: false; error: string };

/**
 * Share with an existing user (immediate) or create a pending email invite.
 * Requires SUPABASE_SERVICE_ROLE_KEY on the server for email lookup.
 */
export async function inviteUserToStrategy(
  strategyId: string,
  emailRaw: string
): Promise<InviteStrategyResult> {
  const email = normalizeEmail(emailRaw);
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  let user;
  try {
    ({ user } = await assertStrategyOwnerForShare(strategyId));
  } catch {
    return { ok: false, error: "You can only share strategies you own." };
  }

  const selfEmail = (user.email ?? "").toLowerCase().trim();
  if (email === selfEmail) {
    return { ok: false, error: "You cannot share a strategy with yourself." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Server is not configured for invitations (missing service role key).",
    };
  }

  let inviteeId: string | null;
  try {
    inviteeId = await findUserIdByEmail(admin, email);
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Could not look up user by email.",
    };
  }

  const supabase = await createClient();

  if (inviteeId) {
    if (inviteeId === user.id) {
      return { ok: false, error: "You cannot share a strategy with yourself." };
    }

    const { error } = await supabase.from("strategy_shares").insert({
      strategy_id: strategyId,
      user_id: inviteeId,
      role: "viewer",
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "That user already has access." };
      }
      return { ok: false, error: clarifySupabaseTableError(error.message) };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/strategies/${strategyId}`);
    revalidatePath(`/strategies/${strategyId}/edit`);
    return { ok: true, kind: "shared" };
  }

  const { data: inserted, error: invErr } = await supabase
    .from("strategy_invites")
    .insert({
      strategy_id: strategyId,
      invitee_email: email,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (invErr) {
    if (invErr.code === "23505") {
      return {
        ok: false,
        error: "An invite for that email is already pending.",
      };
    }
    return { ok: false, error: clarifySupabaseTableError(invErr.message) };
  }

  revalidatePath(`/strategies/${strategyId}/edit`);
  return { ok: true, kind: "invited", token: inserted.token };
}

export async function revokeStrategyShare(shareId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: row } = await supabase
    .from("strategy_shares")
    .select("id, strategy_id")
    .eq("id", shareId)
    .maybeSingle();

  if (!row) throw new Error("Not found");

  const { data: strat } = await supabase
    .from("strategies")
    .select("owner_id")
    .eq("id", row.strategy_id)
    .maybeSingle();

  if (!strat || strat.owner_id !== user.id) {
    throw new Error("Not found");
  }

  const { error } = await supabase.from("strategy_shares").delete().eq("id", shareId);
  if (error) throw new Error(clarifySupabaseTableError(error.message));

  revalidatePath("/dashboard");
  revalidatePath(`/strategies/${row.strategy_id}`);
  revalidatePath(`/strategies/${row.strategy_id}/edit`);
}

export async function revokeStrategyInvite(inviteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: inv } = await supabase
    .from("strategy_invites")
    .select("id, strategy_id")
    .eq("id", inviteId)
    .maybeSingle();

  if (!inv) throw new Error("Not found");

  const { data: strat } = await supabase
    .from("strategies")
    .select("owner_id")
    .eq("id", inv.strategy_id)
    .maybeSingle();

  if (!strat || strat.owner_id !== user.id) {
    throw new Error("Not found");
  }

  const { error } = await supabase.from("strategy_invites").delete().eq("id", inviteId);
  if (error) throw new Error(clarifySupabaseTableError(error.message));

  revalidatePath(`/strategies/${inv.strategy_id}/edit`);
}
