import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { authDebug } from "@/lib/auth/debug-log";
import { isSupabaseCloudProjectUrl } from "@/lib/supabase/config";

function first(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/** Params Supabase may append when the browser should continue OAuth (PKCE) at /authorize. */
const OAUTH_RESUME_KEYS = [
  "provider",
  "redirect_to",
  "code_challenge",
  "code_challenge_method",
  "scope",
  "state",
] as const;

function normalizeRedirectTo(raw: string, appOrigin: string): string {
  try {
    const u = new URL(raw);
    const app = new URL(appOrigin);
    if (
      u.hostname === app.hostname &&
      u.pathname.replace(/\/$/, "") === "/auth/v1/callback"
    ) {
      return `${appOrigin}/auth/callback`;
    }
  } catch {
    /* keep raw */
  }
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const codeChallenge = first(sp.code_challenge);
  const provider = first(sp.provider);

  if (codeChallenge && provider) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

    if (!base || !isSupabaseCloudProjectUrl(base)) {
      const detail = encodeURIComponent(
        "NEXT_PUBLIC_SUPABASE_URL must be https://YOUR_PROJECT.supabase.co (Supabase Dashboard → Settings → API), not your Vercel site URL."
      );
      redirect(`/login?error=config&detail=${detail}`);
    }

    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    const appOrigin = host ? `${proto}://${host}` : null;

    let supabaseAuthorizeHost = "";
    try {
      supabaseAuthorizeHost = new URL(base).hostname;
    } catch {
      supabaseAuthorizeHost = "(invalid)";
    }
    authDebug("login.pkce_resume", {
      provider,
      appOrigin,
      supabaseAuthorizeHost,
      redirect_to_raw: first(sp.redirect_to) ?? null,
    });

    const qs = new URLSearchParams();
    for (const [key, raw] of Object.entries(sp)) {
      const val = first(raw);
      if (!val) continue;
      const allow =
        (OAUTH_RESUME_KEYS as readonly string[]).includes(key) ||
        key.startsWith("code_");
      if (!allow) continue;
      if (key === "redirect_to" && appOrigin) {
        qs.set("redirect_to", normalizeRedirectTo(val, appOrigin));
        continue;
      }
      qs.set(key, val);
    }
    redirect(`${base}/auth/v1/authorize?${qs.toString()}`);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[hsl(222_47%_5%)] p-4">
      {/* Ambient gradients */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,hsl(212_90%_55%/0.22),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_80%,hsl(152_60%_40%/0.12),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_0%_100%,hsl(217_90%_60%/0.08),transparent_45%)]"
        aria-hidden
      />
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(217_33%_18%/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(217_33%_18%/0.35)_1px,transparent_1px)] bg-[size:48px_48px] opacity-[0.35]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,hsl(222_47%_5%),transparent_35%,hsl(222_47%_5%))]"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-[hsl(222_40%_9%/0.85)] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="space-y-1 text-center">
          <h1 className="font-mono text-xl font-semibold tracking-tight text-white">
            Strategy Vault
          </h1>
          <p className="text-sm text-white/55">
            Internal strategy documentation
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
