import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getRequestOrigin } from "@/lib/auth/request-origin";
import { isSupabaseCloudProjectUrl } from "@/lib/supabase/config";

/**
 * Server-side OAuth start so `redirect_to` uses the real request host (Vercel /
 * forwarded headers). Client-only signInWithOAuth can still send users to
 * Supabase "Site URL" (e.g. localhost) if that URL is misconfigured in the dashboard.
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const origin = getRequestOrigin(request);
  const redirectTo = `${origin}/auth/callback`;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  if (!isSupabaseCloudProjectUrl(supabaseUrl)) {
    const detail = encodeURIComponent(
      "NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL (…supabase.co from Dashboard → Settings → API), not your Vercel deployment URL."
    );
    return NextResponse.redirect(`${origin}/login?error=config&detail=${detail}`);
  }

  const pkceCookies: {
    name: string;
    value: string;
    options: CookieOptions;
  }[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        pkceCookies.push(...cookiesToSet);
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error || !data.url) {
    const detail = encodeURIComponent(error?.message ?? "OAuth sign-in failed");
    return NextResponse.redirect(`${origin}/login?error=oauth&detail=${detail}`);
  }

  const res = NextResponse.redirect(data.url);
  pkceCookies.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, options);
  });
  return res;
}
