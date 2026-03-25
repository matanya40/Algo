import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

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
    if (base) {
      const qs = new URLSearchParams();
      for (const [key, raw] of Object.entries(sp)) {
        const val = first(raw);
        if (!val) continue;
        const allow =
          (OAUTH_RESUME_KEYS as readonly string[]).includes(key) ||
          key.startsWith("code_");
        if (allow) qs.set(key, val);
      }
      redirect(`${base}/auth/v1/authorize?${qs.toString()}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="font-mono text-xl font-semibold tracking-tight">
            Strategy Vault
          </h1>
          <p className="text-sm text-muted-foreground">
            Internal strategy documentation
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
