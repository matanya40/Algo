import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireUserSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }
  return { supabase, user } as const;
}

export function publicConnectionRow(row: Record<string, unknown>) {
  const ta = row.trading_accounts;
  const rest = { ...row };
  delete rest.password_encrypted;
  delete rest.sec_encrypted;
  delete rest.trading_accounts;
  const accountsCount = Array.isArray(ta) ? ta.length : 0;
  return { ...rest, accountsCount };
}

