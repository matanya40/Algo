import Link from "next/link";
import { StrategyCard } from "@/components/strategy/strategy-card";
import { StrategyTable } from "@/components/strategy/strategy-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { clarifySupabaseTableError } from "@/lib/supabase/db-errors";
import type { StrategyStatus, StrategyWithMetrics } from "@/lib/types";
import { Plus } from "lucide-react";

const STATUSES: (StrategyStatus | "all")[] = [
  "all",
  "idea",
  "research",
  "testing",
  "live",
  "archived",
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const statusFilter = sp.status ?? "all";

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

  let query = supabase
    .from("strategies")
    .select("*, strategy_metrics(*)")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }
  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: rows, error } = await query;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load strategies: {clarifySupabaseTableError(error.message)}
      </div>
    );
  }

  const list = (rows ?? []) as StrategyWithMetrics[];

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
        <Button asChild>
          <Link href="/strategies/new">
            <Plus className="mr-2 h-4 w-4" />
            New strategy
          </Link>
        </Button>
      </div>

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        method="get"
        action="/dashboard"
      >
        <Input
          name="q"
          placeholder="Search by name…"
          defaultValue={q}
          className="max-w-md"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm sm:w-[180px]"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface/40 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No strategies yet. Create one to centralize your NinjaTrader exports,
            screenshots, and notes.
          </p>
          <Button asChild className="mt-4">
            <Link href="/strategies/new">Create strategy</Link>
          </Button>
        </div>
      ) : (
        <>
          <StrategyTable rows={list} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:hidden">
            {list.map((row) => (
              <StrategyCard key={row.id} row={row} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
