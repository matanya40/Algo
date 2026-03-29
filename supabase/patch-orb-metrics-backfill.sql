-- Sync ORB catalog + all user strategies linked to the template with NinjaTrader
-- Performance Summary ($) — All trades (see parameters_json.performanceSummary).
-- Run once in Supabase SQL after deploying schema changes.

update public.strategy_templates
set
  win_rate = 45.29,
  total_trades = 340,
  winning_trades = 154,
  losing_trades = 186,
  net_profit = 56000.70,
  max_drawdown = -3443.05,
  profit_factor = 1.76,
  average_trade = 164.71,
  updated_at = now()
where slug = 'atch-open-range-breakout';

-- Force vault metrics to match the template (fixes older rows still showing 51,650 / — fields)
update public.strategy_metrics sm
set
  win_rate = 45.29,
  total_trades = 340,
  winning_trades = 154,
  losing_trades = 186,
  net_profit = 56000.70,
  max_drawdown = -3443.05,
  profit_factor = 1.76,
  average_trade = 164.71,
  updated_at = now()
from public.strategies s
where sm.strategy_id = s.id
  and s.template_slug = 'atch-open-range-breakout';
