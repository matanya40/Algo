/**
 * Backtest / vendor-style documentation tabs (screenshots + DB notes per strategy).
 */

export type StrategyDocTabAsset = {
  kind: "image" | "file";
  storagePath: string;
  fileName: string;
  mimeType: string | null;
};

export type StrategyDocTab = {
  id: string;
  label: string;
  explanation: string;
  asset: StrategyDocTabAsset | null;
};

export const DEFAULT_STRATEGY_DOC_TABS: StrategyDocTab[] = [
  { id: "analysis", label: "Analysis", explanation: "", asset: null },
  {
    id: "monthly-analysis",
    label: "Monthly Analysis",
    explanation: "",
    asset: null,
  },
  { id: "summary", label: "Summary", explanation: "", asset: null },
  { id: "parameters", label: "Parameters", explanation: "", asset: null },
  {
    id: "performance-data",
    label: "Performance Data",
    explanation: "",
    asset: null,
  },
];

function isDocTabAsset(v: unknown): v is StrategyDocTabAsset {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    (o.kind === "image" || o.kind === "file") &&
    typeof o.storagePath === "string" &&
    typeof o.fileName === "string" &&
    (o.mimeType === null || typeof o.mimeType === "string")
  );
}

export function normalizeDocumentationTabs(raw: unknown): StrategyDocTab[] {
  const defaults = DEFAULT_STRATEGY_DOC_TABS.map((t) => ({ ...t }));
  if (!Array.isArray(raw)) return defaults;

  const byId = new Map(defaults.map((t) => [t.id, { ...t }]));
  for (const row of raw) {
    if (typeof row !== "object" || row === null) continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    if (!id || !byId.has(id)) continue;
    const cur = byId.get(id)!;
    if (typeof o.label === "string" && o.label.trim()) cur.label = o.label.trim();
    if (typeof o.explanation === "string") cur.explanation = o.explanation;
    if (o.asset === null) cur.asset = null;
    else if (isDocTabAsset(o.asset)) cur.asset = { ...o.asset };
  }
  return Array.from(byId.values());
}

export function parseDocumentationTabsJson(
  json: unknown
): StrategyDocTab[] | null {
  if (json === null || json === undefined) return null;
  return normalizeDocumentationTabs(json);
}
