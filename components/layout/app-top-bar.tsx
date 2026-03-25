import { Badge } from "@/components/ui/badge";

export function AppTopBar() {
  const env =
    process.env.NEXT_PUBLIC_APP_ENV ??
    (process.env.VERCEL_ENV === "preview"
      ? "staging"
      : process.env.VERCEL_ENV === "production"
        ? "production"
        : "development");

  return (
    <div className="hidden h-10 items-center border-b border-border bg-background px-6 md:flex">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Environment</span>
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          {env}
        </Badge>
      </div>
    </div>
  );
}
