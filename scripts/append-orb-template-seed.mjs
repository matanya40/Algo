/**
 * Writes supabase/_orb_seed_fragment.sql — UTF-8, idempotent INSERT for strategy_templates.
 * Run: node scripts/append-orb-template-seed.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "lib/data/orb-template-parameters.json");
const j = fs.readFileSync(jsonPath, "utf8").trim();

const orbDollarJson = "$orb$" + j + "$orb$";

const sql = `-- -----------------------------------------------------------------------------
-- Catalog seed: Opening Range Breakout (vendor documentation summary)
-- Idempotent: safe to re-run.
insert into public.strategy_templates (
  slug,
  sort_order,
  name,
  description,
  status,
  market,
  instrument,
  timeframe,
  session,
  direction,
  concept,
  notes,
  installation_guide,
  parameters_json,
  source_url,
  is_auto_provision,
  win_rate,
  total_trades,
  winning_trades,
  losing_trades,
  net_profit,
  max_drawdown,
  profit_factor,
  average_trade
) values (
  'atch-open-range-breakout',
  10,
  'Opening Range Breakout (NT8)',
  'NinjaTrader 8 Opening Range Breakout: import the add-on, enable Tick Replay on a 1-minute chart, configure ORB times and entry mode, activate your license. Vault documentation only.',
  'testing',
  'CME / futures',
  'MES',
  '1 Minute',
  'Example session: ORB 09:30–09:35 EST · allow trading until 11:00 EST (adjust in strategy)',
  'both',
  'Breakout of the defined opening range. Optional FVG entry. Risk-adjusted sizing. License required for live orders.',
  'Vendor pages may label times in UTC+1 (CET). Align time zone and parameters with your instrument.',
  'Tools → Import → NinjaScript Add-On (restart if prompted). Chart: 1m, e.g. MES, Tick Replay + global historical tick data (Tools → Options → Market Data). Add ORB_STRATEGY to the chart, set parameters, enable. Chart Trader: correct account, ATM None, size to risk. Enter license on the chart panel.',
  ${orbDollarJson}::jsonb,
  'https://automated-trading.ch/NT8/strategies/opening-range-breakout',
  true,
  45.29,
  340,
  154,
  186,
  56000.70,
  -3443.05,
  1.76,
  164.71
)
on conflict (slug) do update set
  sort_order = excluded.sort_order,
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  market = excluded.market,
  instrument = excluded.instrument,
  timeframe = excluded.timeframe,
  session = excluded.session,
  direction = excluded.direction,
  concept = excluded.concept,
  notes = excluded.notes,
  installation_guide = excluded.installation_guide,
  parameters_json = excluded.parameters_json,
  source_url = excluded.source_url,
  is_auto_provision = excluded.is_auto_provision,
  win_rate = excluded.win_rate,
  total_trades = excluded.total_trades,
  winning_trades = excluded.winning_trades,
  losing_trades = excluded.losing_trades,
  net_profit = excluded.net_profit,
  max_drawdown = excluded.max_drawdown,
  profit_factor = excluded.profit_factor,
  average_trade = excluded.average_trade,
  updated_at = now();
`;

const outPath = path.join(root, "supabase/_orb_seed_fragment.sql");
fs.writeFileSync(outPath, sql, "utf8");
