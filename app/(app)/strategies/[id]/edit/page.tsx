import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StrategyDocumentationTabsEditor } from "@/components/strategy/strategy-documentation-tabs-editor";
import { StrategyForm } from "@/components/strategy/strategy-form";
import { StrategySharingPanel } from "@/components/strategy/strategy-sharing-panel";
import { UploadFilesSection } from "@/components/strategy/upload-files-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEmailsByUserIds } from "@/lib/admin/get-user-emails-by-ids";
import { normalizeDocumentationTabs } from "@/lib/strategy-doc-tabs";
import { createClient } from "@/lib/supabase/server";
import { getMetrics } from "@/lib/strategy-helpers";
import type { StrategyFileRow, StrategyWithMetrics } from "@/lib/types";

export default async function EditStrategyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data, error } = await supabase
    .from("strategies")
    .select("*, strategy_metrics(*)")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !data) notFound();

  const row = data as StrategyWithMetrics;
  const metrics = getMetrics(row);

  const { data: files } = await supabase
    .from("strategy_files")
    .select("*")
    .eq("strategy_id", id)
    .order("created_at", { ascending: false });

  const fileRows = (files ?? []) as StrategyFileRow[];

  const docTabs = normalizeDocumentationTabs(
    (row as { documentation_tabs?: unknown }).documentation_tabs
  );

  const { data: shareRows } = await supabase
    .from("strategy_shares")
    .select("id, user_id, created_at")
    .eq("strategy_id", id)
    .order("created_at", { ascending: true });

  const shareUserIds = (shareRows ?? []).map((s) => s.user_id);
  let shareProfiles: { id: string; full_name: string | null }[] = [];
  if (shareUserIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", shareUserIds);
    shareProfiles = profs ?? [];
  }

  const profileById = new Map(
    shareProfiles.map((p) => [p.id, p.full_name] as const)
  );

  const emailByUserId = await getEmailsByUserIds(shareUserIds);

  const initialShares = (shareRows ?? []).map((s) => {
    const email = emailByUserId.get(s.user_id)?.trim() || null;
    const fullName = profileById.get(s.user_id)?.trim() || null;
    const displayName =
      email ||
      fullName ||
      `User ${s.user_id.slice(0, 8)}…`;
    const subtitle = email && fullName ? fullName : null;
    return {
      id: s.id,
      user_id: s.user_id,
      displayName,
      subtitle,
    };
  });

  const { data: inviteRows } = await supabase
    .from("strategy_invites")
    .select("id, invitee_email, token")
    .eq("strategy_id", id)
    .is("accepted_at", null)
    .order("created_at", { ascending: true });

  const initialInvites = (inviteRows ?? []).map((inv) => ({
    id: inv.id,
    invitee_email: inv.invitee_email,
    token: inv.token,
  }));

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const inviteBaseUrl = host ? `${proto}://${host}` : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          Edit strategy
        </h1>
        <p className="text-sm text-muted-foreground">{row.name}</p>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="details" className="font-mono text-xs sm:text-sm">
            Details &amp; metrics
          </TabsTrigger>
          <TabsTrigger value="docs" className="font-mono text-xs sm:text-sm">
            Backtest documentation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6 space-y-6">
          <StrategyForm
            mode="edit"
            strategyId={id}
            initialStrategy={row}
            initialMetrics={metrics}
          />
          <UploadFilesSection strategyId={id} files={fileRows} />
        </TabsContent>

        <TabsContent value="docs" className="mt-6">
          <StrategyDocumentationTabsEditor strategyId={id} initialTabs={docTabs} />
        </TabsContent>
      </Tabs>

      <StrategySharingPanel
        strategyId={id}
        inviteBaseUrl={inviteBaseUrl}
        initialShares={initialShares}
        initialInvites={initialInvites}
      />
    </div>
  );
}
