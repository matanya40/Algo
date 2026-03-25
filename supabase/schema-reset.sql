-- =============================================================================
-- Strategy Vault — FULL RESET (destructive)
-- Removes app tables, triggers, functions, Storage bucket "strategy-assets", and
-- its objects. Does NOT delete auth.users or other Supabase system data.
--
-- Use on DEV (or empty staging) when you want a clean slate before re-running
-- supabase/schema.sql.
--
-- Order: SQL Editor → run THIS file → then run schema.sql.
-- =============================================================================

-- Storage: policies first (they reference public helpers)
drop policy if exists "storage_select_own" on storage.objects;
drop policy if exists "storage_insert_own" on storage.objects;
drop policy if exists "storage_update_own" on storage.objects;
drop policy if exists "storage_delete_own" on storage.objects;

delete from storage.objects
where bucket_id = 'strategy-assets';

delete from storage.buckets
where id = 'strategy-assets';

-- Stop new-user → profiles hook before dropping tables
drop trigger if exists on_auth_user_created on auth.users;

drop trigger if exists strategies_set_updated_at on public.strategies;
drop trigger if exists strategy_metrics_set_updated_at on public.strategy_metrics;
drop trigger if exists strategy_pages_set_updated_at on public.strategy_pages;

drop table if exists public.strategy_page_assets cascade;
drop table if exists public.strategy_pages cascade;
drop table if exists public.strategy_files cascade;
drop table if exists public.strategy_metrics cascade;
drop table if exists public.strategies cascade;
drop table if exists public.profiles cascade;

drop function if exists public.set_updated_at() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.current_user_owns_strategy(uuid) cascade;
drop function if exists public.current_user_owns_strategy_storage_path(text) cascade;
