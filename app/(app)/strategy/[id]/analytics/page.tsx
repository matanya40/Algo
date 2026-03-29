import { redirect } from "next/navigation";

/** Legacy path: `/strategy/[id]/analytics` → canonical `/strategies/[id]/analytics`. */
export default async function StrategyAnalyticsLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/strategies/${id}/analytics`);
}
