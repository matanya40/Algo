import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function nextWithRequest(req: NextRequest) {
  return NextResponse.next({
    request: { headers: new Headers(req.headers) },
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isPublicApi =
    pathname === "/api/health" ||
    pathname === "/api/openapi" ||
    pathname === "/api/docs-frame";

  if (isPublicApi) {
    return nextWithRequest(request);
  }

  if (!supabaseUrl || !supabaseKey || !isSupabaseConfigured()) {
    if (
      pathname.startsWith("/login") ||
      pathname.startsWith("/auth/callback") ||
      pathname.startsWith("/auth/google")
    ) {
      return nextWithRequest(request);
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error:
            "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
        },
        { status: 503 }
      );
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("error", "config");
    return NextResponse.redirect(login);
  }

  let response = nextWithRequest(request);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = nextWithRequest(request);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const isLogin = pathname.startsWith("/login");
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isAuthGoogle = pathname.startsWith("/auth/google");

  if (!user && !isLogin && !isAuthCallback && !isAuthGoogle) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLogin) {
    const dash = request.nextUrl.clone();
    dash.pathname = "/dashboard";
    return NextResponse.redirect(dash);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
