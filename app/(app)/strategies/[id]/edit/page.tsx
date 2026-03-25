import { notFound } from "next/navigation";
import { StrategyForm } from "@/components/strategy/strategy-form";
import { StrategyPageEditor } from "@/components/strategy/strategy-page-editor";
import { UploadFilesSection } from "@/components/strategy/upload-files-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { getMetrics } from "@/lib/strategy-helpers";
import type {
  StrategyFileRow,
  StrategyPageAssetRow,
  StrategyPageWithAssets,
  StrategyWithMetrics,
} from "@/lib/types";

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

  const { data: docPageRaw } = await supabase
    .from("strategy_pages")
    .select("*, strategy_page_assets(*)")
    .eq("strategy_id", id)
    .maybeSingle();

  const docPage = docPageRaw as StrategyPageWithAssets | null;
  const initialPageForEditor = docPage
    ? {
        id: docPage.id,
        strategy_id: docPage.strategy_id,
        title: docPage.title,
        content_json: docPage.content_json,
        created_at: docPage.created_at,
        updated_at: docPage.updated_at,
      }
    : null;
  const pageAssets = (docPage?.strategy_page_assets ??
    []) as StrategyPageAssetRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          Edit strategy
        </h1>
        <p className="text-sm text-muted-foreground">{row.name}</p>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details &amp; metrics</TabsTrigger>
          <TabsTrigger value="docs">Strategy page</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-6">
          <StrategyForm
            mode="edit"
            strategyId={id}
            initialStrategy={row}
            initialMetrics={metrics}
          />
          <UploadFilesSection strategyId={id} files={fileRows} />
        </TabsContent>
        <TabsContent value="docs" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Optional rich documentation — kept separate from structured fields and
            list filters.
          </p>
          <StrategyPageEditor
            strategyId={id}
            initialPage={initialPageForEditor}
            initialAssets={pageAssets}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
