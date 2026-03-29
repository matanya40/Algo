-- =============================================================================
-- Strategy Vault — full database schema (single file)
-- =============================================================================
-- Supabase → SQL Editor → paste this entire file → Run.
--
-- Includes: tables (profiles, strategies, strategy_metrics, trades, strategy_files,
--           strategy_pages, strategy_page_assets, strategy_blog_posts, strategy_blog_assets,
--           strategy_shares, strategy_invites, strategy_templates),
--           triggers, ownership helpers (RLS + Storage), RLS policies,
--           Storage bucket "strategy-assets" + policies on storage.objects.
--
-- Safe to re-run (IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS).
--
-- Optional seed: commented block at the bottom inside /* ... */ — after first
-- Google sign-in, copy only that block (without /* */) and run as a separate query.
-- =============================================================================

-- ----------------------------------------------------------------------------- tables
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'idea' check (
    status in ('idea', 'research', 'testing', 'live', 'archived')
  ),
  market text,
  instrument text,
  timeframe text,
  session text,
  direction text check (
    direction is null or direction in ('long', 'short', 'both')
  ),
  concept text,
  notes text,
  installation_guide text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.strategies add column if not exists parameters_json jsonb not null default '{}'::jsonb;

alter table public.strategies add column if not exists documentation_tabs jsonb not null default '[]'::jsonb;

create table if not exists public.strategy_metrics (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies (id) on delete cascade,
  win_rate numeric,
  total_trades integer,
  winning_trades integer,
  losing_trades integer,
  net_profit numeric,
  max_drawdown numeric,
  profit_factor numeric,
  average_trade numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (strategy_id)
);

/** Individual trade outcomes for analytics (equity curve, win rate, etc.) */
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies (id) on delete cascade,
  pnl numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists trades_strategy_id_idx on public.trades (strategy_id);
create index if not exists trades_strategy_created_idx on public.trades (strategy_id, created_at);

create table if not exists public.strategy_files (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz default now()
);

create index if not exists strategies_owner_id_idx on public.strategies (owner_id);
create index if not exists strategy_files_strategy_id_idx on public.strategy_files (strategy_id);

-- Optional rich documentation per strategy (separate from structured strategy rows)
create table if not exists public.strategy_pages (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies (id) on delete cascade,
  title text not null default 'Strategy page',
  content_json jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (strategy_id)
);

create table if not exists public.strategy_page_assets (
  id uuid primary key default gen_random_uuid(),
  strategy_page_id uuid not null references public.strategy_pages (id) on delete cascade,
  type text not null check (type in ('image', 'file')),
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text not null,
  created_at timestamptz default now()
);

create index if not exists strategy_pages_strategy_id_idx on public.strategy_pages (strategy_id);
create index if not exists strategy_page_assets_page_id_idx on public.strategy_page_assets (strategy_page_id);

-- Multiple blog-style posts per strategy (TipTap JSON + attachments)
create table if not exists public.strategy_blog_posts (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies (id) on delete cascade,
  title text not null default 'Untitled post',
  content_json jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.strategy_blog_assets (
  id uuid primary key default gen_random_uuid(),
  blog_post_id uuid not null references public.strategy_blog_posts (id) on delete cascade,
  type text not null check (type in ('image', 'file')),
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text not null,
  created_at timestamptz default now()
);

create index if not exists strategy_blog_posts_strategy_id_idx on public.strategy_blog_posts (strategy_id);
create index if not exists strategy_blog_assets_post_id_idx on public.strategy_blog_assets (blog_post_id);

/** In-app share: viewer sees full strategy (read-only via app + RLS). */
create table if not exists public.strategy_shares (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer')),
  created_at timestamptz not null default now(),
  unique (strategy_id, user_id)
);

create index if not exists strategy_shares_user_id_idx on public.strategy_shares (user_id);
create index if not exists strategy_shares_strategy_id_idx on public.strategy_shares (strategy_id);

/** Pending invite by email when invitee has no account yet (accept via token). */
create table if not exists public.strategy_invites (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies (id) on delete cascade,
  invitee_email text not null,
  invited_by uuid not null references auth.users (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists strategy_invites_strategy_id_idx on public.strategy_invites (strategy_id);
create unique index if not exists strategy_invites_pending_strategy_email_uidx
  on public.strategy_invites (strategy_id, lower(trim(invitee_email)))
  where accepted_at is null;

-- ----------------------------------------------------------------------------- Tradovate: broker connections & synced data
create table if not exists public.broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  broker_type text not null default 'tradovate',
  display_name text not null,
  environment text not null check (environment in ('demo', 'live')),
  username text not null,
  password_encrypted text not null,
  app_id text not null,
  app_version text not null,
  cid text not null,
  sec_encrypted text not null,
  is_active boolean not null default true,
  last_status text null,
  last_error text null,
  last_tested_at timestamptz null,
  last_sync_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null references public.broker_connections (id) on delete cascade,
  external_account_id text not null,
  external_account_name text null,
  environment text not null,
  status text null,
  balance numeric null,
  net_pnl numeric null,
  unrealized_pnl numeric null,
  available_margin numeric null,
  open_positions_count integer not null default 0,
  total_fills_count integer not null default 0,
  last_synced_at timestamptz null,
  raw_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, external_account_id)
);

create table if not exists public.account_fills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trading_account_id uuid not null references public.trading_accounts (id) on delete cascade,
  external_fill_id text not null,
  symbol text null,
  side text null,
  qty numeric null,
  price numeric null,
  commission numeric null,
  realized_pnl numeric null,
  fill_timestamp timestamptz null,
  raw_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trading_account_id, external_fill_id)
);

create table if not exists public.account_position_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trading_account_id uuid not null references public.trading_accounts (id) on delete cascade,
  symbol text null,
  side text null,
  qty numeric null,
  avg_price numeric null,
  unrealized_pnl numeric null,
  snapshot_at timestamptz not null default now(),
  raw_json jsonb null,
  created_at timestamptz not null default now()
);

create table if not exists public.account_derived_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trading_account_id uuid not null references public.trading_accounts (id) on delete cascade,
  total_trades integer not null default 0,
  winning_trades integer not null default 0,
  losing_trades integer not null default 0,
  gross_profit numeric not null default 0,
  gross_loss numeric not null default 0,
  net_profit numeric not null default 0,
  win_rate numeric not null default 0,
  avg_win numeric not null default 0,
  avg_loss numeric not null default 0,
  largest_win numeric not null default 0,
  largest_loss numeric not null default 0,
  average_trade numeric not null default 0,
  max_drawdown numeric not null default 0,
  equity_curve jsonb null,
  daily_pnl_curve jsonb null,
  updated_at timestamptz not null default now(),
  unique (trading_account_id)
);

create index if not exists idx_broker_connections_user_active
  on public.broker_connections (user_id, is_active);

create index if not exists idx_trading_accounts_user_connection
  on public.trading_accounts (user_id, connection_id);

create index if not exists idx_trading_accounts_connection_external
  on public.trading_accounts (connection_id, external_account_id);

create index if not exists idx_account_fills_account_time
  on public.account_fills (trading_account_id, fill_timestamp desc nulls last);

create index if not exists idx_account_position_snapshots_account_time
  on public.account_position_snapshots (trading_account_id, snapshot_at desc);

create index if not exists idx_account_derived_stats_account
  on public.account_derived_stats (trading_account_id);

-- Catalog templates (vendor summaries); cloned into `strategies` per user (RPC or signup).
create table if not exists public.strategy_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sort_order integer not null default 0,
  name text not null,
  description text,
  status text not null default 'testing' check (
    status in ('idea', 'research', 'testing', 'live', 'archived')
  ),
  market text,
  instrument text,
  timeframe text,
  session text,
  direction text check (
    direction is null or direction in ('long', 'short', 'both')
  ),
  concept text,
  notes text,
  installation_guide text,
  parameters_json jsonb not null default '{}'::jsonb,
  source_url text,
  is_auto_provision boolean not null default false,
  win_rate numeric,
  total_trades integer,
  winning_trades integer,
  losing_trades integer,
  net_profit numeric,
  max_drawdown numeric,
  profit_factor numeric,
  average_trade numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.strategies add column if not exists template_slug text;

create unique index if not exists strategies_owner_template_slug_uidx
  on public.strategies (owner_id, template_slug)
  where template_slug is not null;

create or replace function public.provision_auto_templates_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  new_id uuid;
begin
  for t in
    select *
    from public.strategy_templates
    where is_auto_provision = true
    order by sort_order asc, name asc
  loop
    if exists (
      select 1
      from public.strategies s
      where s.owner_id = p_user_id
        and s.template_slug = t.slug
    ) then
      continue;
    end if;

    insert into public.strategies (
      owner_id, name, description, status, market, instrument, timeframe, session, direction,
      concept, notes, installation_guide, template_slug, parameters_json, documentation_tabs
    ) values (
      p_user_id,
      t.name,
      t.description,
      t.status,
      t.market,
      t.instrument,
      t.timeframe,
      t.session,
      t.direction,
      t.concept,
      t.notes,
      t.installation_guide,
      t.slug,
      coalesce(t.parameters_json, '{}'::jsonb),
      '[]'::jsonb
    )
    returning id into new_id;

    insert into public.strategy_metrics (
      strategy_id,
      win_rate, total_trades, winning_trades, losing_trades,
      net_profit, max_drawdown, profit_factor, average_trade
    ) values (
      new_id,
      t.win_rate, t.total_trades, t.winning_trades, t.losing_trades,
      t.net_profit, t.max_drawdown, t.profit_factor, t.average_trade
    );
  end loop;
end;
$$;

revoke all on function public.provision_auto_templates_for_user(uuid) from public;

create or replace function public.clone_strategy_from_template(p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t record;
  new_id uuid;
begin
  if uid is null then
    raise exception 'Unauthorized';
  end if;

  select * into t from public.strategy_templates where slug = p_slug;
  if not found then
    raise exception 'Template not found';
  end if;

  if exists (
    select 1 from public.strategies s
    where s.owner_id = uid and s.template_slug = p_slug
  ) then
    raise exception 'Template already added';
  end if;

  insert into public.strategies (
    owner_id, name, description, status, market, instrument, timeframe, session, direction,
    concept, notes, installation_guide, template_slug, parameters_json, documentation_tabs
  ) values (
    uid,
    t.name,
    t.description,
    t.status,
    t.market,
    t.instrument,
    t.timeframe,
    t.session,
    t.direction,
    t.concept,
    t.notes,
    t.installation_guide,
    t.slug,
    coalesce(t.parameters_json, '{}'::jsonb),
    '[]'::jsonb
  )
  returning id into new_id;

  insert into public.strategy_metrics (
    strategy_id,
    win_rate, total_trades, winning_trades, losing_trades,
    net_profit, max_drawdown, profit_factor, average_trade
  ) values (
    new_id,
    t.win_rate, t.total_trades, t.winning_trades, t.losing_trades,
    t.net_profit, t.max_drawdown, t.profit_factor, t.average_trade
  );

  return new_id;
end;
$$;

revoke all on function public.clone_strategy_from_template(text) from public;
grant execute on function public.clone_strategy_from_template(text) to authenticated;

create or replace function public.duplicate_strategy(p_source_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s record;
  m record;
  new_id uuid;
  metrics_missing boolean;
begin
  if uid is null then
    raise exception 'Unauthorized';
  end if;

  select * into s
  from public.strategies
  where id = p_source_id and owner_id = uid;

  if not found then
    raise exception 'Not found';
  end if;

  select * into m from public.strategy_metrics where strategy_id = p_source_id;
  metrics_missing := not found;

  insert into public.strategies (
    owner_id, name, description, status, market, instrument, timeframe, session, direction,
    concept, notes, installation_guide, template_slug, parameters_json, documentation_tabs
  ) values (
    uid,
    s.name || ' (copy)',
    s.description,
    s.status,
    s.market,
    s.instrument,
    s.timeframe,
    s.session,
    s.direction,
    s.concept,
    s.notes,
    s.installation_guide,
    null,
    coalesce(s.parameters_json, '{}'::jsonb),
    '[]'::jsonb
  )
  returning id into new_id;

  if metrics_missing then
    insert into public.strategy_metrics (strategy_id) values (new_id);
  else
    insert into public.strategy_metrics (
      strategy_id,
      win_rate, total_trades, winning_trades, losing_trades,
      net_profit, max_drawdown, profit_factor, average_trade
    ) values (
      new_id,
      m.win_rate, m.total_trades, m.winning_trades, m.losing_trades,
      m.net_profit, m.max_drawdown, m.profit_factor, m.average_trade
    );
  end if;

  return new_id;
end;
$$;

revoke all on function public.duplicate_strategy(uuid) from public;
grant execute on function public.duplicate_strategy(uuid) to authenticated;

/** Extra copy from catalog: same data as template but template_slug null (unlimited copies per user). */
create or replace function public.clone_strategy_from_template_extra(p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t record;
  new_id uuid;
begin
  if uid is null then
    raise exception 'Unauthorized';
  end if;

  select * into t from public.strategy_templates where slug = p_slug;
  if not found then
    raise exception 'Template not found';
  end if;

  insert into public.strategies (
    owner_id, name, description, status, market, instrument, timeframe, session, direction,
    concept, notes, installation_guide, template_slug, parameters_json, documentation_tabs
  ) values (
    uid,
    t.name || ' (copy)',
    t.description,
    t.status,
    t.market,
    t.instrument,
    t.timeframe,
    t.session,
    t.direction,
    t.concept,
    t.notes,
    t.installation_guide,
    null,
    coalesce(t.parameters_json, '{}'::jsonb),
    '[]'::jsonb
  )
  returning id into new_id;

  insert into public.strategy_metrics (
    strategy_id,
    win_rate, total_trades, winning_trades, losing_trades,
    net_profit, max_drawdown, profit_factor, average_trade
  ) values (
    new_id,
    t.win_rate, t.total_trades, t.winning_trades, t.losing_trades,
    t.net_profit, t.max_drawdown, t.profit_factor, t.average_trade
  );

  return new_id;
end;
$$;

revoke all on function public.clone_strategy_from_template_extra(text) from public;
grant execute on function public.clone_strategy_from_template_extra(text) to authenticated;

-- ----------------------------------------------------------------------------- triggers: updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists strategies_set_updated_at on public.strategies;
create trigger strategies_set_updated_at
  before update on public.strategies
  for each row execute function public.set_updated_at();

drop trigger if exists strategy_metrics_set_updated_at on public.strategy_metrics;
create trigger strategy_metrics_set_updated_at
  before update on public.strategy_metrics
  for each row execute function public.set_updated_at();

drop trigger if exists strategy_pages_set_updated_at on public.strategy_pages;
create trigger strategy_pages_set_updated_at
  before update on public.strategy_pages
  for each row execute function public.set_updated_at();

drop trigger if exists strategy_blog_posts_set_updated_at on public.strategy_blog_posts;
create trigger strategy_blog_posts_set_updated_at
  before update on public.strategy_blog_posts
  for each row execute function public.set_updated_at();

drop trigger if exists broker_connections_set_updated_at on public.broker_connections;
create trigger broker_connections_set_updated_at
  before update on public.broker_connections
  for each row execute function public.set_updated_at();

drop trigger if exists trading_accounts_set_updated_at on public.trading_accounts;
create trigger trading_accounts_set_updated_at
  before update on public.trading_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists account_fills_set_updated_at on public.account_fills;
create trigger account_fills_set_updated_at
  before update on public.account_fills
  for each row execute function public.set_updated_at();

drop trigger if exists account_derived_stats_set_updated_at on public.account_derived_stats;
create trigger account_derived_stats_set_updated_at
  before update on public.account_derived_stats
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------- trigger: profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;

  perform public.provision_auto_templates_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------- RLS helpers (SECURITY DEFINER)
alter table public.profiles enable row level security;
alter table public.strategies enable row level security;
alter table public.strategy_metrics enable row level security;
alter table public.trades enable row level security;
alter table public.strategy_files enable row level security;
alter table public.strategy_pages enable row level security;
alter table public.strategy_page_assets enable row level security;
alter table public.strategy_blog_posts enable row level security;
alter table public.strategy_blog_assets enable row level security;
alter table public.strategy_templates enable row level security;
alter table public.strategy_shares enable row level security;
alter table public.strategy_invites enable row level security;
alter table public.broker_connections enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.account_fills enable row level security;
alter table public.account_position_snapshots enable row level security;
alter table public.account_derived_stats enable row level security;

drop policy if exists "strategy_templates_select_authenticated" on public.strategy_templates;
create policy "strategy_templates_select_authenticated"
  on public.strategy_templates
  for select
  to authenticated
  using (true);

grant select on public.strategy_templates to authenticated;

-- If you add `is_auto_provision` templates after users already signed up, run once:
--   select public.provision_auto_templates_for_user(id) from auth.users;

-- ORB_TEMPLATE_SEED (JSON: node scripts/patch-orb-schema-json.mjs | fragment: node scripts/append-orb-template-seed.mjs)
-- -----------------------------------------------------------------------------
-- Catalog seed: Opening Range Breakout (English user guide + short reference)
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
  $orb$
{
  "schemaVersion": 3,
  "vendor": "automated-trading.ch",
  "product": "Opening Range Breakout",
  "platform": "NinjaTrader 8",
  "referenceUrl": "https://automated-trading.ch/NT8/strategies/opening-range-breakout",
  "performanceSummary": {
    "title": "Example — NinjaTrader 8 Strategy Performance (Summary $)",
    "period": "04/03/2024 12:00 AM → 13/03/2026 12:00 AM",
    "basis": "All trades",
    "metrics": [
      { "label": "Total net profit", "value": "$56,000.70" },
      { "label": "Gross profit", "value": "$129,572.35" },
      { "label": "Gross loss", "value": "-$73,571.65" },
      { "label": "Commission", "value": "$5,864.30" },
      { "label": "Profit factor", "value": "1.76" },
      { "label": "Max. drawdown", "value": "-$3,443.05" },
      { "label": "Sharpe ratio", "value": "0.53" },
      { "label": "Sortino ratio", "value": "1.96" },
      { "label": "Total # of trades", "value": "340" },
      { "label": "Percent profitable", "value": "45.29%" },
      { "label": "# of winning trades", "value": "154" },
      { "label": "# of losing trades", "value": "186" },
      { "label": "Avg. trade", "value": "$164.71" },
      { "label": "Avg. winning trade", "value": "$841.38" },
      { "label": "Avg. losing trade", "value": "-$395.55" },
      { "label": "Ratio avg. win / avg. loss", "value": "2.13" }
    ]
  },
  "summary": "Opening Range Breakout (ORB) for NinjaTrader 8: define an opening range window, trade the breakout (often with a retest), optionally require a Fair Value Gap (FVG) for entry, size risk with Risk Adjusted quantity, and use Tick Replay for realistic tests. A valid license is required before the strategy will trade.",
  "userGuide": {
    "title": "Opening Range Breakout Strategy – User Guide (NinjaTrader 8)",
    "intro": "How to install, configure, and run the Opening Range Breakout strategy in NinjaTrader 8. Follow the same workflow as on the official strategy page; add screenshots after each step if you document locally.",
    "steps": [
      {
        "n": 1,
        "title": "Import the strategy",
        "body": "Open NinjaTrader 8. Go to Tools → Import → NinjaScript Add-On. Select the strategy package you received and complete the import. Restart NinjaTrader if prompted."
      },
      {
        "n": 2,
        "title": "Configure the chart data series",
        "body": "Open a new chart. Set the instrument (e.g. MES), 1-minute timeframe, Price based on Last, and enable Tick Replay. Use a Custom Range for historical testing. Keep Trading Hours on Use instrument settings."
      },
      {
        "n": 3,
        "title": "Enable global Tick Replay",
        "body": "Go to Tools → Options → Market Data. Under Historical, enable Show Tick Replay and Get data from server. Required for accurate historical fills and strategy behavior."
      },
      {
        "n": 4,
        "title": "Add the strategy to the chart",
        "body": "Right-click the chart → Strategies. Select ORB_STRATEGY (or the installed strategy name), click Add. It appears under Configured strategies."
      },
      {
        "n": 5,
        "title": "Strategy parameters",
        "body": "Set Time Zone to EST, Open Range Time to 09:30–09:35, Allow Trading Until 11:00, Entry Mode to Wait For FVG, and Quantity Strategy to Risk Adjusted. Match risk and order settings to your account."
      },
      {
        "n": 6,
        "title": "Enable the strategy",
        "body": "After reviewing parameters, check Enabled, then OK to activate the strategy on the chart."
      },
      {
        "n": 7,
        "title": "Chart Trader",
        "body": "Enable Chart Trader on the toolbar. Confirm the correct account, ATM Strategy set to None, and order quantity matches your risk plan."
      },
      {
        "n": 8,
        "title": "Strategy control panel",
        "body": "When the strategy runs, the on-chart control panel appears: arm long/short, close positions, adjust quantity, move stop to breakeven. License status and expiration show at the top."
      }
    ],
    "license": {
      "title": "License activation",
      "steps": [
        "Enable Chart Trader on the chart.",
        "Open the strategy license panel on the chart.",
        "Enter your License Key.",
        "Click Check License.",
        "When valid, a green message confirms the license is active and shows the expiration date."
      ],
      "note": "The strategy does not execute trades until the license is valid."
    }
  },
  "coreLogic": [
    { "en": "Defines an opening range in a configurable time window (example: 09:30–09:35 EST)." },
    { "en": "Trades a breakout of that range; a retest is often part of the setup." },
    { "en": "Entry can use Wait For FVG or other modes your build supports." },
    { "en": "You can cap the session with an end time (example: 11:00 EST)." }
  ],
  "groups": [
    {
      "id": "guide_parameters",
      "titleEn": "Parameters (from the guide)",
      "items": [
        { "key": "timeZone", "labelEn": "Time Zone", "value": "EST" },
        { "key": "openRangeTime", "labelEn": "Open Range Time", "value": "09:30–09:35" },
        { "key": "allowTradingUntil", "labelEn": "Allow Trading Until", "value": "11:00" },
        { "key": "entryMode", "labelEn": "Entry Mode", "value": "Wait For FVG" },
        { "key": "quantityStrategy", "labelEn": "Quantity Strategy", "value": "Risk Adjusted" }
      ]
    },
    {
      "id": "chart_setup",
      "titleEn": "Chart & data (from the guide)",
      "items": [
        { "key": "instrument", "labelEn": "Instrument (example)", "value": "MES" },
        { "key": "timeframe", "labelEn": "Timeframe", "value": "1 minute" },
        { "key": "priceBasedOn", "labelEn": "Price based on", "value": "Last" },
        { "key": "tickReplay", "labelEn": "Tick Replay", "value": "On (chart); global historical tick data in Tools → Options → Market Data" },
        { "key": "tradingHours", "labelEn": "Trading hours", "value": "Use instrument settings" }
      ]
    }
  ],
  "disclaimerEn": "The metrics card on this strategy mirrors the NinjaTrader Summary ($) example above when loaded from the catalog. Past performance does not guarantee future results. Not investment advice."
}
$orb$::jsonb,
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


create or replace function public.current_user_owns_strategy(p_strategy_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.strategies s
    where s.id = p_strategy_id and s.owner_id = (select auth.uid())
  );
$$;

revoke all on function public.current_user_owns_strategy(uuid) from public;
grant execute on function public.current_user_owns_strategy(uuid) to authenticated;

create or replace function public.current_user_can_view_strategy(p_strategy_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_owns_strategy(p_strategy_id)
    or exists (
      select 1
      from public.strategy_shares sh
      where sh.strategy_id = p_strategy_id
        and sh.user_id = (select auth.uid())
    );
$$;

revoke all on function public.current_user_can_view_strategy(uuid) from public;
grant execute on function public.current_user_can_view_strategy(uuid) to authenticated;

-- object path = "{strategy_id}/..." (see app upload path)
create or replace function public.current_user_owns_strategy_storage_path(object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  seg text;
  sid uuid;
begin
  seg := split_part(object_name, '/', 1);
  if seg is null or seg = '' then
    return false;
  end if;
  begin
    sid := seg::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return public.current_user_owns_strategy(sid);
end;
$$;

revoke all on function public.current_user_owns_strategy_storage_path(text) from public;
grant execute on function public.current_user_owns_strategy_storage_path(text) to authenticated;

/** Read access to storage objects under a strategy folder (owner or shared viewer). */
create or replace function public.current_user_can_access_strategy_storage_path(object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  seg text;
  sid uuid;
begin
  seg := split_part(object_name, '/', 1);
  if seg is null or seg = '' then
    return false;
  end if;
  begin
    sid := seg::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return public.current_user_can_view_strategy(sid);
end;
$$;

revoke all on function public.current_user_can_access_strategy_storage_path(text) from public;
grant execute on function public.current_user_can_access_strategy_storage_path(text) to authenticated;

/** Accept pending invite: must be signed in as the invited email. */
create or replace function public.accept_strategy_invite(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inv public.strategy_invites%rowtype;
  em text;
begin
  if (select auth.uid()) is null then
    return false;
  end if;

  select email into em
  from auth.users
  where id = (select auth.uid());

  if em is null or length(trim(em)) = 0 then
    return false;
  end if;

  select * into inv
  from public.strategy_invites
  where token = p_token
    and accepted_at is null
  for update;

  if not found then
    return false;
  end if;

  if lower(trim(inv.invitee_email)) <> lower(trim(em)) then
    return false;
  end if;

  if exists (
    select 1 from public.strategies s
    where s.id = inv.strategy_id and s.owner_id = (select auth.uid())
  ) then
    return false;
  end if;

  insert into public.strategy_shares (strategy_id, user_id, role)
  values (inv.strategy_id, (select auth.uid()), 'viewer')
  on conflict (strategy_id, user_id) do nothing;

  update public.strategy_invites
  set accepted_at = now()
  where id = inv.id;

  return true;
end;
$$;

revoke all on function public.accept_strategy_invite(text) from public;
grant execute on function public.accept_strategy_invite(text) to authenticated;

grant select, insert, delete on public.strategy_shares to authenticated;
grant select, insert, delete on public.strategy_invites to authenticated;

grant select, insert, update, delete on public.broker_connections to authenticated;
grant select, insert, update, delete on public.trading_accounts to authenticated;
grant select, insert, update, delete on public.account_fills to authenticated;
grant select, insert, update, delete on public.account_position_snapshots to authenticated;
grant select, insert, update, delete on public.account_derived_stats to authenticated;

-- ----------------------------------------------------------------------------- RLS: public tables
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_select_shared_strategy_owners" on public.profiles;
create policy "profiles_select_shared_strategy_owners" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.strategy_shares sh
      join public.strategies s on s.id = sh.strategy_id
      where sh.user_id = auth.uid()
        and s.owner_id = profiles.id
    )
  );

drop policy if exists "strategies_all_own" on public.strategies;
drop policy if exists "strategies_select_view" on public.strategies;
drop policy if exists "strategies_insert_own" on public.strategies;
drop policy if exists "strategies_update_own" on public.strategies;
drop policy if exists "strategies_delete_own" on public.strategies;
create policy "strategies_select_view" on public.strategies
  for select to authenticated
  using (public.current_user_can_view_strategy(id));
create policy "strategies_insert_own" on public.strategies
  for insert to authenticated
  with check (owner_id = auth.uid());
create policy "strategies_update_own" on public.strategies
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
create policy "strategies_delete_own" on public.strategies
  for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "metrics_all_own" on public.strategy_metrics;
drop policy if exists "metrics_select_view" on public.strategy_metrics;
drop policy if exists "metrics_mutate_own" on public.strategy_metrics;
create policy "metrics_select_view" on public.strategy_metrics
  for select to authenticated
  using (public.current_user_can_view_strategy(strategy_id));
create policy "metrics_mutate_own" on public.strategy_metrics
  for all to authenticated
  using (public.current_user_owns_strategy(strategy_id))
  with check (public.current_user_owns_strategy(strategy_id));

drop policy if exists "trades_all_own" on public.trades;
drop policy if exists "trades_select_view" on public.trades;
drop policy if exists "trades_mutate_own" on public.trades;
create policy "trades_select_view" on public.trades
  for select to authenticated
  using (public.current_user_can_view_strategy(strategy_id));
create policy "trades_mutate_own" on public.trades
  for all to authenticated
  using (public.current_user_owns_strategy(strategy_id))
  with check (public.current_user_owns_strategy(strategy_id));

drop policy if exists "files_all_own" on public.strategy_files;
drop policy if exists "files_select_view" on public.strategy_files;
drop policy if exists "files_mutate_own" on public.strategy_files;
create policy "files_select_view" on public.strategy_files
  for select to authenticated
  using (public.current_user_can_view_strategy(strategy_id));
create policy "files_mutate_own" on public.strategy_files
  for all to authenticated
  using (public.current_user_owns_strategy(strategy_id))
  with check (public.current_user_owns_strategy(strategy_id));

drop policy if exists "strategy_pages_all_own" on public.strategy_pages;
drop policy if exists "strategy_pages_select_view" on public.strategy_pages;
drop policy if exists "strategy_pages_mutate_own" on public.strategy_pages;
create policy "strategy_pages_select_view" on public.strategy_pages
  for select to authenticated
  using (public.current_user_can_view_strategy(strategy_id));
create policy "strategy_pages_mutate_own" on public.strategy_pages
  for all to authenticated
  using (public.current_user_owns_strategy(strategy_id))
  with check (public.current_user_owns_strategy(strategy_id));

drop policy if exists "strategy_page_assets_all_own" on public.strategy_page_assets;
drop policy if exists "strategy_page_assets_select_view" on public.strategy_page_assets;
drop policy if exists "strategy_page_assets_mutate_own" on public.strategy_page_assets;
create policy "strategy_page_assets_select_view" on public.strategy_page_assets
  for select to authenticated
  using (
    exists (
      select 1 from public.strategy_pages sp
      where sp.id = strategy_page_id
        and public.current_user_can_view_strategy(sp.strategy_id)
    )
  );
create policy "strategy_page_assets_mutate_own" on public.strategy_page_assets
  for all to authenticated
  using (
    exists (
      select 1 from public.strategy_pages sp
      where sp.id = strategy_page_id
        and public.current_user_owns_strategy(sp.strategy_id)
    )
  )
  with check (
    exists (
      select 1 from public.strategy_pages sp
      where sp.id = strategy_page_id
        and public.current_user_owns_strategy(sp.strategy_id)
    )
  );

drop policy if exists "strategy_blog_posts_all_own" on public.strategy_blog_posts;
drop policy if exists "strategy_blog_posts_select_view" on public.strategy_blog_posts;
drop policy if exists "strategy_blog_posts_mutate_own" on public.strategy_blog_posts;
create policy "strategy_blog_posts_select_view" on public.strategy_blog_posts
  for select to authenticated
  using (public.current_user_can_view_strategy(strategy_id));
create policy "strategy_blog_posts_mutate_own" on public.strategy_blog_posts
  for all to authenticated
  using (public.current_user_owns_strategy(strategy_id))
  with check (public.current_user_owns_strategy(strategy_id));

drop policy if exists "strategy_blog_assets_all_own" on public.strategy_blog_assets;
drop policy if exists "strategy_blog_assets_select_view" on public.strategy_blog_assets;
drop policy if exists "strategy_blog_assets_mutate_own" on public.strategy_blog_assets;
create policy "strategy_blog_assets_select_view" on public.strategy_blog_assets
  for select to authenticated
  using (
    exists (
      select 1 from public.strategy_blog_posts bp
      where bp.id = blog_post_id
        and public.current_user_can_view_strategy(bp.strategy_id)
    )
  );
create policy "strategy_blog_assets_mutate_own" on public.strategy_blog_assets
  for all to authenticated
  using (
    exists (
      select 1 from public.strategy_blog_posts bp
      where bp.id = blog_post_id
        and public.current_user_owns_strategy(bp.strategy_id)
    )
  )
  with check (
    exists (
      select 1 from public.strategy_blog_posts bp
      where bp.id = blog_post_id
        and public.current_user_owns_strategy(bp.strategy_id)
    )
  );

drop policy if exists "strategy_shares_select" on public.strategy_shares;
drop policy if exists "strategy_shares_insert_owner" on public.strategy_shares;
drop policy if exists "strategy_shares_delete_owner" on public.strategy_shares;
create policy "strategy_shares_select" on public.strategy_shares
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.strategies s
      where s.id = strategy_id and s.owner_id = auth.uid()
    )
  );
create policy "strategy_shares_insert_owner" on public.strategy_shares
  for insert to authenticated
  with check (
    exists (
      select 1 from public.strategies s
      where s.id = strategy_id
        and s.owner_id = auth.uid()
        and s.owner_id is distinct from user_id
    )
  );
create policy "strategy_shares_delete_owner" on public.strategy_shares
  for delete to authenticated
  using (
    exists (
      select 1 from public.strategies s
      where s.id = strategy_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "strategy_invites_select" on public.strategy_invites;
drop policy if exists "strategy_invites_insert_owner" on public.strategy_invites;
drop policy if exists "strategy_invites_delete" on public.strategy_invites;
create policy "strategy_invites_select" on public.strategy_invites
  for select to authenticated
  using (
    invited_by = auth.uid()
    or exists (
      select 1 from public.strategies s
      where s.id = strategy_id and s.owner_id = auth.uid()
    )
    or (
      length(trim(coalesce((select auth.jwt() ->> 'email'), ''))) > 0
      and lower(trim(invitee_email)) = lower(trim((select auth.jwt() ->> 'email')))
    )
  );
create policy "strategy_invites_insert_owner" on public.strategy_invites
  for insert to authenticated
  with check (
    exists (
      select 1 from public.strategies s
      where s.id = strategy_id and s.owner_id = auth.uid()
    )
    and invited_by = auth.uid()
  );
create policy "strategy_invites_delete" on public.strategy_invites
  for delete to authenticated
  using (
    exists (
      select 1 from public.strategies s
      where s.id = strategy_id and s.owner_id = auth.uid()
    )
    or invited_by = auth.uid()
    or (
      length(trim(coalesce((select auth.jwt() ->> 'email'), ''))) > 0
      and lower(trim(invitee_email)) = lower(trim((select auth.jwt() ->> 'email')))
    )
  );

-- Tradovate tables (per-user; server routes use same session + RLS)
drop policy if exists "broker_connections_select_own" on public.broker_connections;
create policy "broker_connections_select_own" on public.broker_connections
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "broker_connections_insert_own" on public.broker_connections;
create policy "broker_connections_insert_own" on public.broker_connections
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "broker_connections_update_own" on public.broker_connections;
create policy "broker_connections_update_own" on public.broker_connections
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "broker_connections_delete_own" on public.broker_connections;
create policy "broker_connections_delete_own" on public.broker_connections
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "trading_accounts_select_own" on public.trading_accounts;
create policy "trading_accounts_select_own" on public.trading_accounts
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "trading_accounts_insert_own" on public.trading_accounts;
create policy "trading_accounts_insert_own" on public.trading_accounts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "trading_accounts_update_own" on public.trading_accounts;
create policy "trading_accounts_update_own" on public.trading_accounts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "trading_accounts_delete_own" on public.trading_accounts;
create policy "trading_accounts_delete_own" on public.trading_accounts
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "account_fills_select_own" on public.account_fills;
create policy "account_fills_select_own" on public.account_fills
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "account_fills_insert_own" on public.account_fills;
create policy "account_fills_insert_own" on public.account_fills
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "account_fills_update_own" on public.account_fills;
create policy "account_fills_update_own" on public.account_fills
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "account_fills_delete_own" on public.account_fills;
create policy "account_fills_delete_own" on public.account_fills
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "account_position_snapshots_select_own" on public.account_position_snapshots;
create policy "account_position_snapshots_select_own" on public.account_position_snapshots
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "account_position_snapshots_insert_own" on public.account_position_snapshots;
create policy "account_position_snapshots_insert_own" on public.account_position_snapshots
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "account_position_snapshots_update_own" on public.account_position_snapshots;
create policy "account_position_snapshots_update_own" on public.account_position_snapshots
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "account_position_snapshots_delete_own" on public.account_position_snapshots;
create policy "account_position_snapshots_delete_own" on public.account_position_snapshots
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "account_derived_stats_select_own" on public.account_derived_stats;
create policy "account_derived_stats_select_own" on public.account_derived_stats
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "account_derived_stats_insert_own" on public.account_derived_stats;
create policy "account_derived_stats_insert_own" on public.account_derived_stats
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "account_derived_stats_update_own" on public.account_derived_stats;
create policy "account_derived_stats_update_own" on public.account_derived_stats
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "account_derived_stats_delete_own" on public.account_derived_stats;
create policy "account_derived_stats_delete_own" on public.account_derived_stats
  for delete to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------- Storage bucket + RLS
-- Bucket: on newer Supabase hosts, SQL insert into storage.buckets may be denied or
-- the table may omit column "public". If insert fails, create manually:
-- Dashboard → Storage → New bucket → id/name: strategy-assets → Private.
insert into storage.buckets (id, name)
values ('strategy-assets', 'strategy-assets')
on conflict (id) do nothing;

drop policy if exists "storage_select_own" on storage.objects;
create policy "storage_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'strategy-assets'
    and public.current_user_can_access_strategy_storage_path(name)
  );

drop policy if exists "storage_insert_own" on storage.objects;
create policy "storage_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'strategy-assets'
    and public.current_user_owns_strategy_storage_path(name)
  );

drop policy if exists "storage_update_own" on storage.objects;
create policy "storage_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'strategy-assets'
    and public.current_user_owns_strategy_storage_path(name)
  );

drop policy if exists "storage_delete_own" on storage.objects;
create policy "storage_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'strategy-assets'
    and public.current_user_owns_strategy_storage_path(name)
  );

-- =============================================================================
-- OPTIONAL SEED — do not run on a fresh schema before at least one user exists.
-- Remove the /* */ comment wrappers and run only this block — after one Google sign-in.
-- =============================================================================
/*
do $$
declare
  v_owner uuid;
  sid uuid;
begin
  select id into v_owner from auth.users order by created_at asc limit 1;
  if v_owner is null then
    raise exception 'No users found. Sign in with Google once, then run this script again.';
  end if;

  insert into public.strategies (
    owner_id, name, description, status, market, instrument, timeframe, session, direction,
    concept, notes, installation_guide
  ) values (
    v_owner,
    'ES Opening Range Breakout',
    'Fade or trade the first 15m range on ES during RTH; focus on high-volume opens.',
    'live',
    'CME',
    'ES',
    '5m',
    'RTH',
    'long',
    'Mark OR high/low after 15 minutes. Enter on retest with volume confirmation; stop beyond range.',
    'Avoid FOMC days. Tighten size on gap > 1%.',
    '1) Add indicator pack ORB-15. 2) Set session template to CME RTH. 3) Enable chart trader hotkeys.'
  ) returning id into sid;

  insert into public.strategy_metrics (
    strategy_id, win_rate, total_trades, winning_trades, losing_trades,
    net_profit, max_drawdown, profit_factor, average_trade
  ) values (
    sid, 56.2, 214, 120, 94, 8420.50, -1950.00, 1.38, 39.35
  );

  insert into public.strategies (
    owner_id, name, description, status, market, instrument, timeframe, session, direction,
    concept, notes, installation_guide
  ) values (
    v_owner,
    'NQ Mean Reversion (VWAP)',
    'Counter-trend scalps back to session VWAP when price stretches > 2σ on 1m.',
    'testing',
    'CME',
    'NQ',
    '1m',
    'RTH',
    'both',
    'Wait for impulse away from VWAP; fade on first failure swing with reduced size.',
    'Paper trade only until 60+ trades sample.',
    'Import workspace NQ-VWAP-MR.xml; link to data feed; set max position 2 contracts.'
  ) returning id into sid;

  insert into public.strategy_metrics (
    strategy_id, win_rate, total_trades, winning_trades, losing_trades,
    net_profit, max_drawdown, profit_factor, average_trade
  ) values (
    sid, 51.8, 87, 45, 42, 910.25, -1320.00, 1.09, 10.46
  );

  insert into public.strategies (
    owner_id, name, description, status, market, instrument, timeframe, session, direction,
    concept, notes, installation_guide
  ) values (
    v_owner,
    'Gold (GC) Swing — H4 Structure',
    'Higher-timeframe swing trades using 4h BOS and daily liquidity sweeps.',
    'research',
    'COMEX',
    'GC',
    '4h',
    'Globex',
    'long',
    'Identify HTF order block; entry on 15m CHoCH in direction of daily bias.',
    'Correlate with DXY; reduce risk ahead of CPI/NFP.',
    'No automated install; journal in Strategy Vault only.'
  ) returning id into sid;

  insert into public.strategy_metrics (
    strategy_id, win_rate, total_trades, winning_trades, losing_trades,
    net_profit, max_drawdown, profit_factor, average_trade
  ) values (
    sid, null, null, null, null, null, null, null, null
  );

  insert into public.strategies (
    owner_id, name, description, status, market, instrument, timeframe, session, direction,
    concept, notes, installation_guide
  ) values (
    v_owner,
    'BTC Perp — Funding Window Scalp',
    'Idea stage: exploit funding spikes around the hourly funding print on major venues.',
    'idea',
    'Crypto',
    'BTCUSDT',
    '15m',
    '24h',
    'short',
    'Hypothesis: crowded long funding → short into print, flat after 5m.',
    'Needs API access and slippage model; not production ready.',
    'N/A'
  ) returning id into sid;

  insert into public.strategy_metrics (
    strategy_id, win_rate, total_trades, winning_trades, losing_trades,
    net_profit, max_drawdown, profit_factor, average_trade
  ) values (
    sid, null, 0, 0, 0, 0, 0, null, null
  );

  insert into public.strategies (
    owner_id, name, description, status, market, instrument, timeframe, session, direction,
    concept, notes, installation_guide
  ) values (
    v_owner,
    'CL Breakout (Archived)',
    'Legacy crude breakout system; retired after regime change 2024.',
    'archived',
    'NYMEX',
    'CL',
    '15m',
    'RTH',
    'both',
    'Donchian 20 breakout with ATR stop; trail with 1.5 ATR.',
    'Kept for historical reference; do not allocate capital.',
    'Strategy removed from live machines.'
  ) returning id into sid;

  insert into public.strategy_metrics (
    strategy_id, win_rate, total_trades, winning_trades, losing_trades,
    net_profit, max_drawdown, profit_factor, average_trade
  ) values (
    sid, 48.1, 512, 246, 266, -3250.00, -8900.00, 0.91, -6.35
  );
end $$;
*/
