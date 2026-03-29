"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { duplicateStrategy } from "@/app/actions/strategy-actions";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

export function DuplicateStrategyButton({ strategyId }: { strategyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const res = await duplicateStrategy(strategyId);
            toast.success("Strategy duplicated");
            router.push(`/strategies/${res.id}`);
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Duplicate failed");
          }
        });
      }}
    >
      <Copy className="mr-2 h-4 w-4" />
      Duplicate
    </Button>
  );
}
