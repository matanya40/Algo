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
