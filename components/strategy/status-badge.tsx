import { Badge } from "@/components/ui/badge";
import type { StrategyStatus } from "@/lib/types";

const variant: Record<
  StrategyStatus,
  "secondary" | "outline" | "success" | "warning" | "default"
> = {
  idea: "secondary",
  research: "outline",
  testing: "warning",
  live: "success",
  archived: "outline",
};

export function StatusBadge({ status }: { status: StrategyStatus }) {
  return (
    <Badge variant={variant[status]} className="font-mono text-[10px] uppercase">
      {status}
    </Badge>
  );
}
