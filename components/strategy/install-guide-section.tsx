import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InstallGuideSection({ text }: { text: string | null }) {
  if (!text?.trim()) {
    return (
      <Card className="border-dashed border-border bg-surface/50">
        <CardHeader>
          <CardTitle className="text-base">Installation guide</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No installation steps yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Installation guide</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
          {text}
        </pre>
      </CardContent>
    </Card>
  );
}
