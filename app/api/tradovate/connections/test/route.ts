import { NextRequest, NextResponse } from "next/server";
import { requireUserSupabase } from "@/lib/tradovate/api-helpers";
import { probeTradovate } from "@/lib/tradovate/sync";
import type { TradovateEnvironment } from "@/lib/tradovate/types";
import { connectionCreateSchema } from "@/lib/tradovate/validation";

/**
 * Test credentials before saving a new connection (server-side only; not persisted).
 */
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
  try {
    const { accountsFound } = await probeTradovate(v.environment as TradovateEnvironment, {
      username: v.username,
      password: v.password,
      appId: v.appId,
      appVersion: v.appVersion,
      cid: v.cid,
      sec: v.sec,
    });
    return NextResponse.json({
      success: true,
      accountsFound,
      message: `Connected. Found ${accountsFound} account(s).`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connection test failed";
    return NextResponse.json(
      {
        success: false,
        accountsFound: 0,
        message: msg,
      },
      { status: 200 }
    );
  }
}
