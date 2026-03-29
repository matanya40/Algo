import { NextRequest, NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto/aes-gcm";
import { requireUserSupabase } from "@/lib/tradovate/api-helpers";
import { probeTradovate } from "@/lib/tradovate/sync";
import type { BrokerConnectionRow, TradovateEnvironment } from "@/lib/tradovate/types";
import { connectionTestOverridesSchema } from "@/lib/tradovate/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const r = await requireUserSupabase();
  if ("error" in r) return r.error;

  const { id } = await ctx.params;

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

  const b = row as BrokerConnectionRow;

  let body: unknown = {};
  try {
    const t = await req.text();
    if (t) body = JSON.parse(t);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const overrides = connectionTestOverridesSchema.safeParse(body);
  const o = overrides.success ? overrides.data : {};

  const env = (o.environment ?? b.environment) as TradovateEnvironment;
  const username = o.username ?? b.username;
  const appId = o.appId ?? b.app_id;
  const appVersion = o.appVersion ?? b.app_version;
  const cid = o.cid ?? b.cid;

  let password: string;
  let sec: string;
  try {
    password =
      o.password && o.password.length > 0 ? o.password : decryptSecret(b.password_encrypted);
    sec = o.sec && o.sec.length > 0 ? o.sec : decryptSecret(b.sec_encrypted);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not read stored credentials";
    return NextResponse.json(
      { success: false, accountsFound: 0, message: msg },
      { status: 200 }
    );
  }

  const now = new Date().toISOString();

  try {
    const { accountsFound } = await probeTradovate(env, {
      username,
      password,
      appId,
      appVersion,
      cid,
      sec,
    });

    await r.supabase
      .from("broker_connections")
      .update({
        last_tested_at: now,
        last_status: "connected",
        last_error: null,
      })
      .eq("id", id)
      .eq("user_id", r.user.id);

    return NextResponse.json({
      success: true,
      accountsFound,
      message: `Connected. Found ${accountsFound} account(s).`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connection test failed";
    await r.supabase
      .from("broker_connections")
      .update({
        last_tested_at: now,
        last_status: "failed",
        last_error: msg.slice(0, 2000),
      })
      .eq("id", id)
      .eq("user_id", r.user.id);

    return NextResponse.json({
      success: false,
      accountsFound: 0,
      message: msg,
    });
  }
}
