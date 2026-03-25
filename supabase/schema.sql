-- =============================================================================
-- Strategy Vault — מסד נתונים מלא (קובץ יחיד)
-- =============================================================================
-- Supabase → SQL Editor → הדבק את הקובץ המלא → Run.
--
-- כולל: טבלאות (profiles, strategies, strategy_metrics, strategy_files,
--       strategy_pages, strategy_page_assets),
--       טריגרים, פונקציות בעלות (RLS + Storage), מדיניות RLS,
--       באקט Storage "strategy-assets" + מדיניות על storage.objects.
--
-- אפשר להריץ שוב בבטחה (IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS).
--
-- דמו נתונים: בסוף הקובץ יש בלוק בתוך הערה /* ... */ — אחרי התחברות ראשונה
--           בפרויקט, העתק רק את הבלוק (בלי /* */) והרץ בשאילתה נפרדת.
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
alter table public.strategy_files enable row level security;
alter table public.strategy_pages enable row level security;
alter table public.strategy_page_assets enable row level security;

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

drop policy if exists "strategies_all_own" on public.strategies;
create policy "strategies_all_own" on public.strategies
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "metrics_all_own" on public.strategy_metrics;
create policy "metrics_all_own" on public.strategy_metrics
  for all
  using (public.current_user_owns_strategy(strategy_id))
  with check (public.current_user_owns_strategy(strategy_id));

drop policy if exists "files_all_own" on public.strategy_files;
create policy "files_all_own" on public.strategy_files
  for all
  using (public.current_user_owns_strategy(strategy_id))
  with check (public.current_user_owns_strategy(strategy_id));

drop policy if exists "strategy_pages_all_own" on public.strategy_pages;
create policy "strategy_pages_all_own" on public.strategy_pages
  for all
  using (public.current_user_owns_strategy(strategy_id))
  with check (public.current_user_owns_strategy(strategy_id));

drop policy if exists "strategy_page_assets_all_own" on public.strategy_page_assets;
create policy "strategy_page_assets_all_own" on public.strategy_page_assets
  for all
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
    and public.current_user_owns_strategy_storage_path(name)
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
-- OPTIONAL SEED (לא להריץ יחד עם סכימה חדשה לפני שיש משתמש)
-- הסר את שורות ההערה /* ו-*/ והרץ רק את הבלוק — אחרי התחברות Google פעם אחת.
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
