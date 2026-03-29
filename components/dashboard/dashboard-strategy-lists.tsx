"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StrategyTable } from "@/components/strategy/strategy-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StrategyWithMetrics } from "@/lib/types";

type Props = {
  owned: StrategyWithMetrics[];
  shared: StrategyWithMetrics[];
  ownerNames: Record<string, string | null>;
  searchQuery: string;
  initialTab: "mine" | "shared";
};

export function DashboardStrategyLists({
  owned,
  shared,
  ownerNames,
  searchQuery,
  initialTab,
}: Props) {
  const router = useRouter();

  return (
    <Tabs
      defaultValue={initialTab}
      className="w-full"
      onValueChange={(v) => {
        const q = new URLSearchParams();
        if (searchQuery) q.set("q", searchQuery);
        if (v === "shared") q.set("tab", "shared");
        const qs = q.toString();
        router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
      }}
    >
      <TabsList className="h-auto flex-wrap gap-1">
        <TabsTrigger value="mine" className="font-mono text-xs sm:text-sm">
          My strategies
          {owned.length > 0 ? (
            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {owned.length}
            </span>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="shared" className="font-mono text-xs sm:text-sm">
          Shared with me
          {shared.length > 0 ? (
            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {shared.length}
            </span>
          ) : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="mine" className="mt-6 space-y-4">
        {owned.length === 0 ? (
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
          <StrategyTable rows={owned} readOnly={false} />
        )}
      </TabsContent>

      <TabsContent value="shared" className="mt-6 space-y-4">
        {shared.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface/40 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              When someone shares a strategy with your account, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              View-only access — open a strategy to explore documentation and analytics.
            </p>
            <StrategyTable
              rows={shared}
              readOnly
              ownerNames={ownerNames}
            />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
