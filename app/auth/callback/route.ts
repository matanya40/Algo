import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { authDebug, authDebugRequestOrigin } from "@/lib/auth/debug-log";
import { getRequestOrigin } from "@/lib/auth/request-origin";

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  authDebugRequestOrigin(request, origin);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const oauthDesc = searchParams.get("error_description");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";

  authDebug("callback.params", {
    hasCode: Boolean(code),
    codeLength: code?.length ?? 0,
    next,
    oauthError: oauthError ?? null,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  if (oauthError) {
    const msg = encodeURIComponent(oauthDesc ?? oauthError);
    return NextResponse.redirect(`${origin}/login?error=oauth&detail=${msg}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Session cookies MUST be set on this response object (Route Handler + redirect).
  const redirectResponse = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    authDebug("callback.exchange_failed", { message: error.message });
    const detail = encodeURIComponent(error.message);
    return NextResponse.redirect(`${origin}/login?error=auth&detail=${detail}`);
  }

  authDebug("callback.success", {
    redirectTo: `${origin}${next}`,
  });
  return redirectResponse;
}
