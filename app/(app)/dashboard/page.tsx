import Link from "next/link";
import { DashboardStrategyLists } from "@/components/dashboard/dashboard-strategy-lists";
import { TemplateLibrarySection } from "@/components/strategy/template-library-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { clarifySupabaseTableError } from "@/lib/supabase/db-errors";
import type { StrategyTemplateRow, StrategyWithMetrics } from "@/lib/types";
import { Plus } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const initialTab = sp.tab === "shared" ? "shared" : "mine";

  let supabase;
  let user;
  try {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Could not reach authentication. Check your network and Supabase URL in
        .env.local.
      </div>
    );
  }

  if (!user) return null;

  let ownedQuery = supabase
    .from("strategies")
    .select("*, strategy_metrics(*)")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (q) {
    ownedQuery = ownedQuery.ilike("name", `%${q}%`);
  }

  const { data: ownedRows, error: ownedErr } = await ownedQuery;

  if (ownedErr) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load strategies: {clarifySupabaseTableError(ownedErr.message)}
      </div>
    );
  }

  const owned = (ownedRows ?? []) as StrategyWithMetrics[];

  const sharedQuery = supabase
    .from("strategy_shares")
    .select("strategies(*, strategy_metrics(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: shareRows, error: shareErr } = await sharedQuery;

  if (shareErr) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load shared strategies: {clarifySupabaseTableError(shareErr.message)}
      </div>
    );
  }

  let shared = (shareRows ?? [])
    .map((r) => {
      const s = r.strategies as unknown as StrategyWithMetrics | null;
      return s;
    })
    .filter((s): s is StrategyWithMetrics => s != null);

  if (q) {
    const qq = q.toLowerCase();
    shared = shared.filter((s) => s.name.toLowerCase().includes(qq));
  }

  const ownerIds = [
    ...new Set(
      shared
        .map((s) => s.owner_id)
        .filter((id): id is string => id != null && id.length > 0)
    ),
  ];

  const ownerNames: Record<string, string | null> = {};
  if (ownerIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ownerIds);
    for (const p of profs ?? []) {
      ownerNames[p.id] = p.full_name;
    }
  }

  let templates: StrategyTemplateRow[] = [];
  let templateError: string | null = null;
  try {
    const { data: tdata, error: terr } = await supabase
      .from("strategy_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    if (terr) templateError = clarifySupabaseTableError(terr.message);
    else templates = (tdata ?? []) as StrategyTemplateRow[];
  } catch {
    templateError = "Could not load templates.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Your strategies and backtest documentation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild>
            <Link href="/strategies/new#templates">From template</Link>
          </Button>
          <Button asChild>
            <Link href="/strategies/new">
              <Plus className="mr-2 h-4 w-4" />
              New strategy
            </Link>
          </Button>
        </div>
      </div>

      {templateError ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          {templateError}
        </div>
      ) : (
        <TemplateLibrarySection templates={templates} />
      )}

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        method="get"
        action="/dashboard"
      >
        {initialTab === "shared" ? (
          <input type="hidden" name="tab" value="shared" />
        ) : null}
        <Input
          name="q"
          placeholder="Search by name…"
          defaultValue={q}
          className="max-w-md"
        />
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      <DashboardStrategyLists
        owned={owned}
        shared={shared}
        ownerNames={ownerNames}
        searchQuery={q}
        initialTab={initialTab}
      />
    </div>
  );
}
