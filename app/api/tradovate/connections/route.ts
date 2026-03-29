import { NextRequest, NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto/aes-gcm";
import { publicConnectionRow, requireUserSupabase } from "@/lib/tradovate/api-helpers";
import { connectionCreateSchema } from "@/lib/tradovate/validation";

export async function GET() {
  const r = await requireUserSupabase();
  if ("error" in r) return r.error;

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
      updated_at,
      trading_accounts (id)
    `
    )
    .eq("user_id", r.user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = (data ?? []).map((row) => publicConnectionRow(row as Record<string, unknown>));
  return NextResponse.json({ data: list });
}

export async function POST(req: NextRequest) {
  const r = await requireUserSupabase();
  if ("error" in r) return r.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = connectionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const v = parsed.data;
  let passwordEnc: string;
  let secEnc: string;
  try {
    passwordEnc = encryptSecret(v.password);
    secEnc = encryptSecret(v.sec);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Encryption error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data, error } = await r.supabase
    .from("broker_connections")
    .insert({
      user_id: r.user.id,
      broker_type: "tradovate",
      display_name: v.displayName,
      environment: v.environment,
      username: v.username,
      password_encrypted: passwordEnc,
      app_id: v.appId,
      app_version: v.appVersion,
      cid: v.cid,
      sec_encrypted: secEnc,
      last_status: "never_tested",
    })
    .select(
      "id, user_id, broker_type, display_name, environment, username, app_id, app_version, cid, is_active, last_status, last_error, last_tested_at, last_sync_at, deleted_at, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: publicConnectionRow(data as Record<string, unknown>),
  });
}
