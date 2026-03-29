export type StrategyStatus =
  | "idea"
  | "research"
  | "testing"
  | "live"
  | "archived";

export type StrategyDirection = "long" | "short" | "both";

export type StrategyRow = {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  status: StrategyStatus;
  market: string | null;
  instrument: string | null;
  timeframe: string | null;
  session: string | null;
  direction: StrategyDirection | null;
  concept: string | null;
  notes: string | null;
  installation_guide: string | null;
  /** Structured parameter reference (e.g. vendor template JSON). */
  parameters_json?: Record<string, unknown> | null;
  /** Tabbed screenshots + DB notes (see `lib/strategy-doc-tabs.ts`). */
  documentation_tabs?: unknown;
  /** Set when this row was created from a catalog template (e.g. ORB). */
  template_slug?: string | null;
  created_at: string;
  updated_at: string;
};

/** Read-only catalog rows (Supabase `strategy_templates`). */
export type StrategyTemplateRow = {
  id: string;
  slug: string;
  sort_order: number;
  name: string;
  description: string | null;
  status: StrategyStatus;
  market: string | null;
  instrument: string | null;
  timeframe: string | null;
  session: string | null;
  direction: StrategyDirection | null;
  concept: string | null;
  notes: string | null;
  installation_guide: string | null;
  parameters_json: Record<string, unknown>;
  source_url: string | null;
  is_auto_provision: boolean;
  win_rate: number | null;
  total_trades: number | null;
  winning_trades: number | null;
  losing_trades: number | null;
  net_profit: number | null;
  max_drawdown: number | null;
  profit_factor: number | null;
  average_trade: number | null;
  created_at: string;
  updated_at: string;
};

export type StrategyMetricsRow = {
  id: string;
  strategy_id: string;
  win_rate: number | null;
  total_trades: number | null;
  winning_trades: number | null;
  losing_trades: number | null;
  net_profit: number | null;
  max_drawdown: number | null;
  profit_factor: number | null;
  average_trade: number | null;
  created_at: string;
  updated_at: string;
};

/** One closed trade for analytics (PnL series). */
export type TradeRow = {
  id: string;
  strategy_id: string;
  pnl: number | string;
  created_at: string;
};

export type StrategyAnalyticsSnapshot = {
  /** Rows in `trades` for this strategy (imported). Charts use only this. */
  importedTradeCount: number;
  /** True when curves are synthesized from `strategy_metrics` (no imported trades). */
  chartDemoMode?: boolean;
  kpis: {
    winRate: number | null;
    netProfit: number;
    profitFactor: number | null;
    maxDrawdown: number;
  };
  equityCurve: { date: string; equity: number }[];
  drawdownSeries: { date: string; drawdown: number }[];
  winLoss: { wins: number; losses: number };
  tradesOverTime: { label: string; count: number }[];
  tradesOverTimeGranularity: "day" | "week";
  summary: {
    avgTrade: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  };
};

export type StrategyFileRow = {
  id: string;
  strategy_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type StrategyWithMetrics = StrategyRow & {
  strategy_metrics: StrategyMetricsRow | StrategyMetricsRow[] | null;
};

export type StrategyPageAssetRow = {
  id: string;
  strategy_page_id: string;
  type: "image" | "file";
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
};

export type StrategyPageRow = {
  id: string;
  strategy_id: string;
  title: string;
  /** Tiptap / ProseMirror JSON */
  content_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StrategyPageWithAssets = StrategyPageRow & {
  strategy_page_assets: StrategyPageAssetRow[] | null;
};

/** Multiple blog posts per strategy (TipTap JSON + file attachments). */
export type StrategyBlogAssetRow = {
  id: string;
  blog_post_id: string;
  type: "image" | "file";
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
};

export type StrategyBlogPostRow = {
  id: string;
  strategy_id: string;
  title: string;
  content_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StrategyBlogPostWithAssets = StrategyBlogPostRow & {
  strategy_blog_assets: StrategyBlogAssetRow[] | null;
};
