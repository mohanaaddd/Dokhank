-- ============================================================================
-- DOKHAN — RESET (destructive)
--
-- Run this ONLY when you want to overwrite the database with a clean copy of
-- the migrations. It drops every object this project owns in `public`, the
-- signup trigger on `auth.users`, this project's storage policies and any
-- scheduled cron jobs. Auth users, storage buckets and the files inside them
-- are left alone (see the optional blocks at the bottom).
--
-- After this file: run migrations 01 → 05 in order, then seed.sql, then the
-- optional cron file. See RUNBOOK.md §1.
-- ============================================================================

-- ── 1 · cron jobs (no-op unless pg_cron is installed) ───────────────────────
do $$
declare
  v_job text;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    foreach v_job in array array[
      'dokhan_assign_couriers',
      'dokhan_flag_stuck_orders',
      'dokhan_purge_retention',
      'dokhan_rotate_promotions',
      'dokhan_notify_restock'
    ] loop
      begin
        perform cron.unschedule(v_job);
      exception when others then
        null;
      end;
    end loop;
  end if;
end;
$$;

-- ── 2 · the signup trigger lives outside `public` ───────────────────────────
drop trigger if exists on_auth_user_created on auth.users;

-- ── 3 · storage policies owned by this project ──────────────────────────────
do $$
declare
  v_policy text;
begin
  for v_policy in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        policyname like 'id\_docs%'
        or policyname like 'avatars%'
        or policyname like 'delivery\_proofs%'
        or policyname like 'product\_images%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', v_policy);
  end loop;
end;
$$;

-- ── 4 · everything else ─────────────────────────────────────────────────────
-- Tables, enums, views, functions, sequences and policies all live in `public`,
-- so one cascade removes the whole schema. Realtime publication membership is
-- dropped with the tables.
drop schema public cascade;
create schema public;

alter schema public owner to pg_database_owner;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;
comment on schema public is 'standard public schema';

-- ── 5 · wipe test accounts ──────────────────────────────────────────────────
-- The username/password redesign requires a clean auth namespace. The trigger
-- was removed above, so deleting auth users cannot recreate public profiles.
delete from auth.users;

-- ── 6 · storage files ───────────────────────────────────────────────────────
-- Storage protects direct SQL deletes. Remove old files through the Storage API
-- if a completely empty bucket is required; migrations recreate the policies.
