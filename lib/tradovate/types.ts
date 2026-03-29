export type TradovateEnvironment = "demo" | "live";

export type TradovateCredentials = {
  username: string;
  password: string;
  appId: string;
  appVersion: string;
  cid: string;
  sec: string;
};

export type BrokerConnectionRow = {
  id: string;
  user_id: string;
  broker_type: string;
  display_name: string;
  environment: TradovateEnvironment;
  username: string;
  password_encrypted: string;
  app_id: string;
  app_version: string;
  cid: string;
  sec_encrypted: string;
  is_active: boolean;
  last_status: string | null;
  last_error: string | null;
  last_tested_at: string | null;
  last_sync_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TradingAccountRow = {
  id: string;
  user_id: string;
  connection_id: string;
  external_account_id: string;
  external_account_name: string | null;
  environment: string;
  status: string | null;
  balance: string | number | null;
  net_pnl: string | number | null;
  unrealized_pnl: string | number | null;
  available_margin: string | number | null;
  open_positions_count: number;
  total_fills_count: number;
  last_synced_at: string | null;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type AccountDerivedStatsRow = {
  trading_account_id: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  gross_profit: string | number;
  gross_loss: string | number;
  net_profit: string | number;
  win_rate: string | number;
  avg_win: string | number;
  avg_loss: string | number;
  largest_win: string | number;
  largest_loss: string | number;
  average_trade: string | number;
  max_drawdown: string | number;
  equity_curve: unknown;
  daily_pnl_curve: unknown;
  updated_at: string;
};
