"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
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

export function LoginForm() {
  const searchParams = useSearchParams();
  const err = searchParams.get("error");
  const detail = searchParams.get("detail");
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) {
      setLoading(false);
      console.error(error);
    }
  }

  return (
    <div className="space-y-4">
      {err ? (
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
      ) : null}
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
