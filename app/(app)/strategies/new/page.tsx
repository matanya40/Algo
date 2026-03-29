import { TemplateLibrarySection } from "@/components/strategy/template-library-section";
import { StrategyForm } from "@/components/strategy/strategy-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { clarifySupabaseTableError } from "@/lib/supabase/db-errors";
import type { StrategyTemplateRow } from "@/lib/types";

export default async function NewStrategyPage() {
  let templates: StrategyTemplateRow[] = [];
  let templateError: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("strategy_templates")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      templateError = clarifySupabaseTableError(error.message);
    } else {
      templates = (data ?? []) as StrategyTemplateRow[];
    }
  } catch {
    templateError = "Could not load templates.";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          New strategy
        </h1>
        <p className="text-sm text-muted-foreground">
          Document logic, metrics, and optional files in one place.
        </p>
      </div>

      {templateError ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          {templateError}
        </div>
      ) : (
        <TemplateLibrarySection templates={templates} />
      )}

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details &amp; metrics</TabsTrigger>
          <TabsTrigger value="docs" disabled>
            Strategy page
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <StrategyForm mode="create" />
        </TabsContent>
        <TabsContent value="docs">
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Create the strategy first, then use{" "}
            <span className="font-mono text-foreground">Edit</span> to add the
            optional documentation page (rich text, screenshots, attachments).
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
