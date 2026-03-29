import type { StrategyRow } from "@/lib/types";

export function isStrategyOwner(
  strategy: Pick<StrategyRow, "owner_id">,
  userId: string
): boolean {
  return strategy.owner_id != null && strategy.owner_id === userId;
}
