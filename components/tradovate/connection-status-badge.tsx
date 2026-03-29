"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const variants: Record<
  string,
  { label: string; className: string }
> = {
  connected: {
    label: "Connected",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  failed: {
    label: "Failed",
    className: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  never_tested: {
    label: "Never tested",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  syncing: {
    label: "Syncing",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  },
  disabled: {
    label: "Disabled",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
};

export function ConnectionStatusBadge({
  status,
  isActive,
}: {
  status: string | null;
  isActive: boolean;
}) {
  if (!isActive) {
    return (
      <Badge variant="outline" className={cn("font-mono text-xs", variants.disabled.className)}>
        {variants.disabled.label}
      </Badge>
    );
  }
  const key = status && variants[status] ? status : "never_tested";
  const v = variants[key] ?? variants.never_tested;
  return (
    <Badge variant="outline" className={cn("font-mono text-xs", v.className)}>
      {v.label}
    </Badge>
  );
}
