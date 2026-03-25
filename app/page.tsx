import { redirect } from "next/navigation";

type Search = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Supabase OAuth sometimes lands on `/` with ?code= (e.g. when Site URL is only the
 * origin). Forward to /auth/callback so the session exchange runs; otherwise a bare
 * redirect to /dashboard would drop the code and show a blank page.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const code = first(sp.code);
  const err = first(sp.error);
  if (code || err) {
    const q = new URLSearchParams();
    if (code) q.set("code", code);
    if (err) q.set("error", err);
    const desc = first(sp.error_description);
    if (desc) q.set("error_description", desc);
    const next = first(sp.next);
    if (next) q.set("next", next);
    redirect(`/auth/callback?${q.toString()}`);
  }
  redirect("/dashboard");
}
