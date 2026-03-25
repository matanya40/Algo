export default function ApiDocsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-4">
      <div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          API documentation
        </h1>
        <p className="text-sm text-muted-foreground">
          OpenAPI 3 · Swagger UI (isolated). Sign in first; &quot;Try it out&quot; sends your
          session cookies to this site.
        </p>
      </div>
      <iframe
        title="OpenAPI Swagger UI"
        src="/api/docs-frame"
        className="min-h-[70vh] w-full flex-1 rounded-lg border border-border bg-background"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
