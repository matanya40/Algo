"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function decodedDetail(detail: string | null): string {
  if (!detail) return "";
  try {
    return decodeURIComponent(detail);
  } catch {
    return detail;
  }
}

/** Isolated so `useSearchParams` does not block the whole form (fixes blank /login on prod). */
function LoginOAuthErrors() {
  const searchParams = useSearchParams();
  const err = searchParams.get("error");
  const detail = searchParams.get("detail");

  if (!err) return null;

  return (
    <div className="space-y-1 text-center text-sm text-destructive">
      <p>
        {err === "config"
          ? "Supabase is not configured. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the Supabase dashboard (API: Project URL + anon JWT or publishable key)."
          : err === "oauth"
            ? "OAuth was rejected or cancelled."
            : "Sign-in failed. Try again."}
      </p>
      {detail ? (
        <p className="break-words text-xs opacity-90">
          {decodedDetail(detail)}
        </p>
      ) : null}
      {err === "auth" &&
      decodedDetail(detail).toLowerCase().includes("invalid api key") ? (
        <p className="text-center text-xs text-muted-foreground">
          In Supabase: Project Settings → API → copy the long <strong>anon</strong>{" "}
          (public) JWT key (<code className="rounded bg-muted px-1">eyJ…</code>),
          put it in <code className="rounded bg-muted px-1">.env.local</code> as{" "}
          <code className="rounded bg-muted px-1">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>
          , then restart the dev server.
        </p>
      ) : null}
    </div>
  );
}

export function LoginForm() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    // OAuth must return to the same origin the user is on. NEXT_PUBLIC_SITE_URL is
    // baked in at build time; if it points at localhost in Vercel, prod sign-in would
    // still redirect to localhost. Prefer the live browser origin for redirectTo.
    const base = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${base}/auth/callback`,
      },
    });
    if (error) {
      setLoading(false);
      console.error(error);
    }
  }

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <LoginOAuthErrors />
      </Suspense>
      <Button
        type="button"
        className="w-full font-medium"
        disabled={loading}
        onClick={() => void signInWithGoogle()}
      >
        {loading ? "Redirecting…" : "Continue with Google"}
      </Button>
    </div>
  );
}
