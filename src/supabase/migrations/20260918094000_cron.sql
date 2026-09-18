-- ============================================================================
-- DOKHAN — 05 · scheduled work (OPTIONAL, run last)
--
-- Enable pg_cron first: Dashboard → Database → Extensions → pg_cron.
-- If it is not enabled this file still applies cleanly; it only creates the
-- helper functions and skips the scheduling block with a notice.
-- ============================================================================

-- Dispatch: hand any unclaimed order to a working courier in its zone.
create or replace function public.fn_cron_assign_couriers()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   public.orders;
  v_courier public.couriers;
  v_count   integer := 0;
begin
  for v_order in
    select * from public.orders
    where courier_id is null
      and status in ('confirmed', 'packing')
    order by placed_at
    limit 50
  loop
    select c.* into v_courier
    from public.couriers c
    left join public.addresses a on a.id = v_order.address_id
    where c.status <> 'offline'
      and (c.zone_id is null or a.zone_id is null or c.zone_id = a.zone_id)
    order by random()
    limit 1;

    if v_courier.id is not null then
      update public.orders set
        courier_id = v_courier.id,
        courier_snapshot = jsonb_build_object(
          'name', v_courier.name, 'vehicle', v_courier.vehicle, 'initials', v_courier.initials
        )
      where id = v_order.id;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- Flag orders sitting in one status past their SLA so ops can see them.
create or replace function public.fn_cron_flag_stuck_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with stuck as (
    select o.id, o.status
    from public.orders o
    where o.status in ('confirmed', 'packing', 'on_the_way')
      and o.placed_at < now() - interval '45 minutes'
      and not exists (
        select 1 from public.audit_log l
        where l.entity = 'orders' and l.entity_id = o.id::text and l.action = 'sla_breach'
      )
  )
  insert into public.audit_log (action, entity, entity_id, payload)
  select 'sla_breach', 'orders', s.id::text, jsonb_build_object('status', s.status)
  from stuck s;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Retention: GPS pings after 30 days, approved ID images after 90 days.
create or replace function public.fn_cron_purge_retention()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.courier_locations where recorded_at < now() - interval '30 days';

  delete from storage.objects
  where bucket_id = 'id-docs'
    and created_at < now() - interval '90 days'
    and (storage.foldername(name))[1] in (
      select v.user_id::text
      from public.id_verifications v
      where v.status = 'approved' and v.reviewed_at < now() - interval '90 days'
    );

  update public.id_verifications
  set front_path = null, back_path = null
  where status = 'approved'
    and reviewed_at < now() - interval '90 days'
    and (front_path is not null or back_path is not null);
end;
$$;

-- Promotions in/out of season.
create or replace function public.fn_cron_rotate_promotions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.promotions set is_active = false
  where is_active and ends_at is not null and ends_at <= now();

  update public.promotions set is_active = true
  where not is_active
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
    and (max_uses is null or uses < max_uses);
end;
$$;

-- Restock: queue a notice for every watcher whose product came back in stock.
create or replace function public.fn_cron_notify_restock()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with back_in_stock as (
    select w.user_id, w.product_id
    from public.restock_watches w
    join public.products p on p.id = w.product_id
    join public.notification_prefs n on n.user_id = w.user_id
    where p.stock > 0 and p.is_active and w.notified_at is null and n.restock
  )
  insert into public.audit_log (actor, action, entity, entity_id, payload)
  select b.user_id, 'restock_notice', 'products', b.product_id, '{}'::jsonb
  from back_in_stock b;

  get diagnostics v_count = row_count;

  update public.restock_watches w
  set notified_at = now()
  where w.notified_at is null
    and exists (select 1 from public.products p where p.id = w.product_id and p.stock > 0 and p.is_active);

  return v_count;
end;
$$;

revoke execute on function public.fn_cron_assign_couriers() from public;
revoke execute on function public.fn_cron_flag_stuck_orders() from public;
revoke execute on function public.fn_cron_purge_retention() from public;
revoke execute on function public.fn_cron_rotate_promotions() from public;
revoke execute on function public.fn_cron_notify_restock() from public;

-- ── scheduling ──────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron is not enabled — skipping schedules. Enable it in the dashboard and re-run this file.';
    return;
  end if;

  perform cron.unschedule(jobname)
  from cron.job
  where jobname in (
    'dokhan_assign_couriers',
    'dokhan_flag_stuck',
    'dokhan_refresh_trending',
    'dokhan_purge_retention',
    'dokhan_rotate_promotions',
    'dokhan_notify_restock'
  );

  perform cron.schedule('dokhan_assign_couriers',   '*/5 * * * *',  'select public.fn_cron_assign_couriers()');
  perform cron.schedule('dokhan_flag_stuck',        '*/15 * * * *', 'select public.fn_cron_flag_stuck_orders()');
  perform cron.schedule('dokhan_refresh_trending',  '0 * * * *',    'refresh materialized view concurrently public.v_trending_products');
  perform cron.schedule('dokhan_purge_retention',   '0 3 * * *',    'select public.fn_cron_purge_retention()');
  perform cron.schedule('dokhan_rotate_promotions', '0 4 * * *',    'select public.fn_cron_rotate_promotions()');
  perform cron.schedule('dokhan_notify_restock',    '0 5 * * *',    'select public.fn_cron_notify_restock()');
end;
$$;
