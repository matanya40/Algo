import { StrategyForm } from "@/components/strategy/strategy-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NewStrategyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          New strategy
        </h1>
        <p className="text-sm text-muted-foreground">
          Document logic, metrics, and optional files in one place.
        </p>
      </div>

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
