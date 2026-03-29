import { NextRequest, NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto/aes-gcm";
import { publicConnectionRow, requireUserSupabase } from "@/lib/tradovate/api-helpers";
import { connectionUpdateSchema } from "@/lib/tradovate/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const r = await requireUserSupabase();
  if ("error" in r) return r.error;

  const { id } = await ctx.params;

  const { data, error } = await r.supabase
    .from("broker_connections")
    .select(
      `
      id,
      user_id,
      broker_type,
      display_name,
      environment,
      username,
      app_id,
      app_version,
      cid,
      is_active,
      last_status,
      last_error,
      last_tested_at,
      last_sync_at,
      deleted_at,
      created_at,
      updated_at
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

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const r = await requireUserSupabase();
  if ("error" in r) return r.error;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = connectionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

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

  const v = parsed.data;
  const patch: Record<string, unknown> = {};

  if (v.displayName !== undefined) patch.display_name = v.displayName;
  if (v.environment !== undefined) patch.environment = v.environment;
  if (v.username !== undefined) patch.username = v.username;
  if (v.appId !== undefined) patch.app_id = v.appId;
  if (v.appVersion !== undefined) patch.app_version = v.appVersion;
  if (v.cid !== undefined) patch.cid = v.cid;
  if (v.isActive !== undefined) patch.is_active = v.isActive;
  if (v.deletedAt !== undefined) patch.deleted_at = v.deletedAt;

  if (v.password !== undefined && v.password.length > 0) {
    try {
      patch.password_encrypted = encryptSecret(v.password);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Encryption error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (v.sec !== undefined) {
    if (v.sec.length > 0) {
      try {
        patch.sec_encrypted = encryptSecret(v.sec);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Encryption error";
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    } else {
      try {
        patch.sec_encrypted = encryptSecret("");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Encryption error";
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({
      data: publicConnectionRow(row as Record<string, unknown>),
    });
  }

  const { data: updated, error: updErr } = await r.supabase
    .from("broker_connections")
    .update(patch)
    .eq("id", id)
    .eq("user_id", r.user.id)
    .select(
      "id, user_id, broker_type, display_name, environment, username, app_id, app_version, cid, is_active, last_status, last_error, last_tested_at, last_sync_at, deleted_at, created_at, updated_at"
    )
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({
    data: publicConnectionRow(updated as Record<string, unknown>),
  });
}
