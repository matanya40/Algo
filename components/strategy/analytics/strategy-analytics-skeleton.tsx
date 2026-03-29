import { Skeleton } from "@/components/ui/skeleton";

export function StrategyAnalyticsSkeleton() {
  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="h-9 w-64 max-w-full rounded-md" />
        <Skeleton className="h-4 w-48 rounded-md" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 bg-card/40 p-6 shadow-lg"
          >
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="mt-3 h-9 w-28 rounded-md" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 bg-card/40 p-4 shadow-lg sm:p-6"
          >
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="mt-2 h-3 w-56 rounded-md" />
            <Skeleton className="mt-6 h-[280px] w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 p-6 shadow-lg">
        <Skeleton className="h-4 w-32 rounded-md" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
