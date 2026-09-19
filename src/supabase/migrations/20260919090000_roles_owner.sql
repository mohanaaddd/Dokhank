-- ============================================================================
-- DOKHAN — 05 · roles (customer / courier / owner), owner console, analytics
-- Apply after 04. Safe to re-run: every object is created with `if not exists`
-- or `create or replace`, and every policy is dropped before it is recreated.
--
-- Design rules kept from 01-03:
--   · the client never writes money, stock or status directly
--   · every owner mutation is a security-definer RPC that audits itself
--   · `role` is server-owned — there is no grant that lets anyone set it
-- ============================================================================

-- ── role enum + column ──────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('customer', 'courier', 'owner');
  end if;
end;
$$;

alter table public.profiles
  add column if not exists role public.app_role not null default 'customer';

create index if not exists profiles_role_idx
  on public.profiles (role) where role <> 'customer';

-- ── guards ──────────────────────────────────────────────────────────────────
-- security definer so the lookup itself is never filtered by the very policies
-- it is being used to evaluate (no recursion on `profiles`).
create or replace function public.fn_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    'customer'::public.app_role
  );
$$;

create or replace function public.fn_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.fn_is_service() or public.fn_role() = 'owner';
$$;

-- Widened: a courier is anyone holding the role, or anyone already wired to a
-- `couriers` row (dispatch rows can be seeded before the account exists).
create or replace function public.fn_is_courier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.fn_role() = 'courier'
      or exists (select 1 from public.couriers c where c.user_id = auth.uid());
$$;

-- Resolves the caller's courier row, linking it by phone on first sign-in so an
-- ops-provisioned courier only has to log in once.
create or replace function public.fn_my_courier()
returns public.couriers
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_courier public.couriers;
begin
  select * into v_courier from public.couriers where user_id = auth.uid();
  return v_courier;
end;
$$;

-- ── role assignment (service role only) ─────────────────────────────────────
create or replace function public.fn_set_role(p_phone text, p_role public.app_role)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_digits  text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if not public.fn_is_service() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  select * into v_profile
  from public.profiles
  where regexp_replace(phone, '\D', '', 'g') like '%' || v_digits
  order by created_at
  limit 1;

  if not found then
    raise exception 'PROFILE_NOT_FOUND:%', p_phone using errcode = '22023';
  end if;

  update public.profiles set role = p_role where id = v_profile.id;

  insert into public.audit_log (actor, action, entity, entity_id, payload)
  values (auth.uid(), 'set_role', 'profiles', v_profile.id::text,
          jsonb_build_object('role', p_role, 'phone', v_profile.phone));

  return jsonb_build_object('id', v_profile.id, 'phone', v_profile.phone, 'role', p_role);
end;
$$;

-- ── owner analytics ─────────────────────────────────────────────────────────
-- security_invoker keeps RLS on, and the explicit fn_is_owner() gate means a
-- customer who guesses the view name gets an empty set rather than their own
-- numbers dressed up as store numbers.
create or replace view public.v_owner_revenue_daily with (security_invoker = true) as
select (o.placed_at at time zone 'Africa/Cairo')::date as day,
       count(*)                                        as orders_count,
       count(*) filter (where o.status = 'delivered')   as delivered_count,
       coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)::numeric(12,2) as revenue
from public.orders o
where public.fn_is_owner()
  and o.placed_at > now() - interval '60 days'
group by 1
order by 1;

create or replace view public.v_owner_top_products with (security_invoker = true) as
select oi.product_id,
       max(oi.name_en)                                as name_en,
       max(oi.name_ar)                                as name_ar,
       sum(oi.quantity)::integer                      as units,
       sum(oi.quantity * oi.unit_price)::numeric(12,2) as revenue
from public.order_items oi
join public.orders o on o.id = oi.order_id
where public.fn_is_owner()
  and o.status <> 'cancelled'
  and o.placed_at > now() - interval '30 days'
group by oi.product_id
order by units desc;

create or replace view public.v_owner_today with (security_invoker = true) as
with windowed as (
  select o.total, o.status, o.placed_at,
         (o.placed_at at time zone 'Africa/Cairo')::date as day
  from public.orders o
  where public.fn_is_owner()
    and o.placed_at > now() - interval '60 days'
    and o.status <> 'cancelled'
),
today as (select (now() at time zone 'Africa/Cairo')::date as d)
select
  coalesce(sum(w.total) filter (where w.day = t.d), 0)::numeric(12,2)                      as revenue_today,
  coalesce(sum(w.total) filter (where w.day = t.d - 1), 0)::numeric(12,2)                  as revenue_yesterday,
  coalesce(sum(w.total) filter (where w.day > t.d - 7), 0)::numeric(12,2)                  as revenue_7d,
  coalesce(sum(w.total) filter (where w.day > t.d - 14 and w.day <= t.d - 7), 0)::numeric(12,2) as revenue_prev_7d,
  coalesce(sum(w.total) filter (where w.day > t.d - 30), 0)::numeric(12,2)                 as revenue_30d,
  count(*) filter (where w.day = t.d)::integer                                             as orders_today,
  count(*) filter (where w.day > t.d - 30)::integer                                        as orders_30d
from today t left join windowed w on true
group by t.d;

-- ── owner visibility ────────────────────────────────────────────────────────
drop policy if exists products_read_owner       on public.products;
drop policy if exists product_specs_read_owner  on public.product_specs;
drop policy if exists orders_select_owner       on public.orders;
drop policy if exists order_items_select_owner  on public.order_items;
drop policy if exists order_events_select_owner on public.order_events;
drop policy if exists couriers_select_ops       on public.couriers;
drop policy if exists zones_read_owner          on public.zones;
drop policy if exists promotions_read_owner     on public.promotions;
drop policy if exists profiles_select_ops       on public.profiles;
drop policy if exists audit_log_select_owner    on public.audit_log;

create policy products_read_owner on public.products
  for select to authenticated using (public.fn_is_owner());

create policy product_specs_read_owner on public.product_specs
  for select to authenticated using (public.fn_is_owner());

create policy orders_select_owner on public.orders
  for select to authenticated using (public.fn_is_owner());

create policy order_items_select_owner on public.order_items
  for select to authenticated using (public.fn_is_owner());

create policy order_events_select_owner on public.order_events
  for select to authenticated using (public.fn_is_owner());

-- Owners see the whole roster; couriers still only ever see their own row.
create policy couriers_select_ops on public.couriers
  for select to authenticated using (public.fn_is_owner());

create policy zones_read_owner on public.zones
  for select to authenticated using (public.fn_is_owner());

create policy promotions_read_owner on public.promotions
  for select to authenticated using (public.fn_is_owner());

-- The order board needs the customer's name and phone; a courier gets it only
-- for the order currently assigned to them.
create policy profiles_select_ops on public.profiles
  for select to authenticated using (
    public.fn_is_owner()
    or exists (
      select 1 from public.orders o
      join public.couriers c on c.id = o.courier_id
      where o.user_id = public.profiles.id and c.user_id = auth.uid()
    )
  );

grant select on public.audit_log to authenticated;

create policy audit_log_select_owner on public.audit_log
  for select to authenticated using (public.fn_is_owner());

grant select on public.v_owner_revenue_daily to authenticated;
grant select on public.v_owner_top_products  to authenticated;
grant select on public.v_owner_today         to authenticated;

-- ── owner writes (RPC only — no table grants are added) ─────────────────────
create or replace function public.fn_owner_update_product(p_product jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   text := nullif(p_product ->> 'id', '');
  v_spec jsonb;
  v_i    integer := 0;
  v_row  public.products;
begin
  if not public.fn_is_owner() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  if v_id is null then
    raise exception 'PRODUCT_ID_REQUIRED' using errcode = '22023';
  end if;

  insert into public.products (
    id, name_en, name_ar, tagline_en, tagline_ar, description_en, description_ar,
    price, compare_at_price, image_url, category_id, stock, badge, is_active
  )
  values (
    v_id,
    coalesce(p_product ->> 'name_en', ''),
    coalesce(p_product ->> 'name_ar', p_product ->> 'name_en', ''),
    coalesce(p_product ->> 'tagline_en', ''),
    coalesce(p_product ->> 'tagline_ar', p_product ->> 'tagline_en', ''),
    coalesce(p_product ->> 'description_en', ''),
    coalesce(p_product ->> 'description_ar', p_product ->> 'description_en', ''),
    greatest(coalesce((p_product ->> 'price')::numeric, 0), 0),
    nullif(p_product ->> 'compare_at_price', '')::numeric,
    coalesce(p_product ->> 'image_url', ''),
    (coalesce(p_product ->> 'category_id', 'vapes'))::public.category_id,
    greatest(coalesce((p_product ->> 'stock')::integer, 0), 0),
    nullif(p_product ->> 'badge', '')::public.product_badge,
    coalesce((p_product ->> 'is_active')::boolean, true)
  )
  on conflict (id) do update set
    name_en          = excluded.name_en,
    name_ar          = excluded.name_ar,
    tagline_en       = excluded.tagline_en,
    tagline_ar       = excluded.tagline_ar,
    description_en   = excluded.description_en,
    description_ar   = excluded.description_ar,
    price            = excluded.price,
    compare_at_price = excluded.compare_at_price,
    image_url        = excluded.image_url,
    category_id      = excluded.category_id,
    stock            = excluded.stock,
    badge            = excluded.badge,
    is_active        = excluded.is_active
  returning * into v_row;

  if p_product ? 'specs' then
    delete from public.product_specs where product_id = v_id;
    for v_spec in select * from jsonb_array_elements(p_product -> 'specs') loop
      insert into public.product_specs (product_id, label_en, label_ar, value_en, value_ar, sort_order)
      values (
        v_id,
        coalesce(v_spec ->> 'label_en', ''),
        coalesce(v_spec ->> 'label_ar', v_spec ->> 'label_en', ''),
        coalesce(v_spec ->> 'value_en', ''),
        coalesce(v_spec ->> 'value_ar', v_spec ->> 'value_en', ''),
        v_i
      );
      v_i := v_i + 1;
    end loop;
  end if;

  insert into public.audit_log (actor, action, entity, entity_id, payload)
  values (auth.uid(), 'upsert_product', 'products', v_id, p_product);

  return to_jsonb(v_row);
end;
$$;

-- Inline stock / price edits on the catalog list.
create or replace function public.fn_owner_patch_product(
  p_id text,
  p_price numeric default null,
  p_stock integer default null,
  p_is_active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.products;
begin
  if not public.fn_is_owner() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  update public.products set
    price     = coalesce(greatest(p_price, 0), price),
    stock     = coalesce(greatest(p_stock, 0), stock),
    is_active = coalesce(p_is_active, is_active)
  where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND:%', p_id using errcode = '22023';
  end if;

  insert into public.audit_log (actor, action, entity, entity_id, payload)
  values (auth.uid(), 'patch_product', 'products', p_id,
          jsonb_build_object('price', p_price, 'stock', p_stock, 'is_active', p_is_active));

  return to_jsonb(v_row);
end;
$$;

-- Cancelling has to put the stock back — nothing did that before.
create or replace function public.fn_owner_cancel_order(p_order_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item  public.order_items;
begin
  if not public.fn_is_owner() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = '22023';
  end if;

  if v_order.status in ('delivered', 'cancelled') then
    raise exception 'ILLEGAL_TRANSITION:%->cancelled', v_order.status using errcode = '22023';
  end if;

  for v_item in select * from public.order_items where order_id = v_order.id loop
    update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
  end loop;

  update public.orders
  set status = 'cancelled', cancel_reason = p_reason, courier_id = null
  where id = v_order.id
  returning * into v_order;

  insert into public.order_events (order_id, status, actor, note)
  values (v_order.id, 'cancelled', 'owner', p_reason);

  insert into public.audit_log (actor, action, entity, entity_id, payload)
  values (auth.uid(), 'cancel_order', 'orders', v_order.id::text,
          jsonb_build_object('reason', p_reason));

  return jsonb_build_object('id', v_order.id, 'status', v_order.status);
end;
$$;

create or replace function public.fn_owner_upsert_courier(p_courier jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid := nullif(p_courier ->> 'id', '')::uuid;
  v_row  public.couriers;
  v_name text := coalesce(p_courier ->> 'name', '');
begin
  if not public.fn_is_owner() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  if v_id is null then
    insert into public.couriers (name, initials, phone, vehicle, zone_id, status)
    values (
      v_name,
      public.fn_initials(v_name),
      coalesce(p_courier ->> 'phone', ''),
      coalesce(p_courier ->> 'vehicle', 'Scooter'),
      nullif(p_courier ->> 'zone_id', '')::uuid,
      'offline'
    )
    returning * into v_row;
  else
    update public.couriers set
      name     = coalesce(nullif(v_name, ''), name),
      initials = public.fn_initials(coalesce(nullif(v_name, ''), name)),
      phone    = coalesce(nullif(p_courier ->> 'phone', ''), phone),
      vehicle  = coalesce(nullif(p_courier ->> 'vehicle', ''), vehicle),
      zone_id  = coalesce(nullif(p_courier ->> 'zone_id', '')::uuid, zone_id)
    where id = v_id
    returning * into v_row;
  end if;

  -- If an account with that phone already exists, promote it and link the row.
  update public.profiles p
  set role = 'courier'
  where regexp_replace(p.phone, '\D', '', 'g') like '%' || regexp_replace(v_row.phone, '\D', '', 'g')
  returning p.id into v_id;

  if v_id is not null and v_row.user_id is null then
    update public.couriers set user_id = v_id where id = v_row.id returning * into v_row;
  end if;

  insert into public.audit_log (actor, action, entity, entity_id, payload)
  values (auth.uid(), 'upsert_courier', 'couriers', v_row.id::text, p_courier);

  return to_jsonb(v_row);
end;
$$;

create or replace function public.fn_owner_set_setting(p_key text, p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fn_is_owner() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  insert into public.app_settings (key, value, updated_at)
  values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();

  insert into public.audit_log (actor, action, entity, entity_id, payload)
  values (auth.uid(), 'set_setting', 'app_settings', p_key, p_value);

  return p_value;
end;
$$;

-- ── courier writes ──────────────────────────────────────────────────────────
-- Claiming is a single atomic statement so two couriers can never take the
-- same order: the `courier_id is null` predicate is the lock.
create or replace function public.fn_courier_claim_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_courier public.couriers;
  v_order   public.orders;
begin
  select * into v_courier from public.couriers where user_id = auth.uid();
  if not found then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  update public.orders set
    courier_id = v_courier.id,
    courier_snapshot = jsonb_build_object(
      'name', v_courier.name, 'vehicle', v_courier.vehicle, 'initials', v_courier.initials
    )
  where id = p_order_id
    and courier_id is null
    and status = 'confirmed'
  returning * into v_order;

  if not found then
    raise exception 'ORDER_ALREADY_CLAIMED' using errcode = '22023';
  end if;

  update public.couriers set status = 'assigned' where id = v_courier.id;

  insert into public.order_events (order_id, status, actor, note)
  values (v_order.id, v_order.status, 'courier', 'claimed');

  return jsonb_build_object('id', v_order.id, 'courier_id', v_courier.id);
end;
$$;

-- Widened: the owner assigns and reassigns from the board.
create or replace function public.fn_assign_courier(p_order_id uuid, p_courier_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $
declare
  v_courier public.couriers;
begin
  if not public.fn_is_service() and not public.fn_is_owner() and not public.fn_is_courier() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  select * into v_courier from public.couriers where id = p_courier_id;
  if not found then
    raise exception 'COURIER_NOT_FOUND' using errcode = '22023';
  end if;

  update public.orders set
    courier_id = v_courier.id,
    courier_snapshot = jsonb_build_object(
      'name', v_courier.name, 'vehicle', v_courier.vehicle, 'initials', v_courier.initials
    )
  where id = p_order_id;

  insert into public.audit_log (actor, action, entity, entity_id, payload)
  values (auth.uid(), 'assign_courier', 'orders', p_order_id::text,
          jsonb_build_object('courier_id', v_courier.id));
end;
$;

-- Widened: the owner can now override a stuck order from the console.
create or replace function public.fn_advance_order_status(p_order_id uuid, p_status public.order_status)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   public.orders;
  v_courier public.couriers;
  v_owner   boolean := public.fn_is_owner();
  v_allowed boolean;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = '22023';
  end if;

  select * into v_courier from public.couriers where user_id = auth.uid();

  if not v_owner
     and not public.fn_is_service()
     and (v_courier.id is null or v_order.courier_id is distinct from v_courier.id) then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  v_allowed := case v_order.status
    when 'confirmed'  then p_status in ('packing', 'cancelled')
    when 'packing'    then p_status in ('on_the_way', 'cancelled')
    when 'on_the_way' then p_status = 'delivered'
    else false
  end;

  if not v_allowed then
    raise exception 'ILLEGAL_TRANSITION:%->%', v_order.status, p_status using errcode = '22023';
  end if;

  update public.orders set status = p_status where id = v_order.id returning * into v_order;

  insert into public.order_events (order_id, status, actor)
  values (
    v_order.id,
    p_status,
    case when v_courier.id is not null then 'courier' when v_owner then 'owner' else 'system' end
  );

  -- A courier who just finished is free again.
  if p_status in ('delivered', 'cancelled') and v_courier.id is not null then
    update public.couriers set status = 'idle' where id = v_courier.id and status = 'assigned';
  end if;

  return jsonb_build_object('id', v_order.id, 'status', v_order.status, 'delivered_at', v_order.delivered_at);
end;
$$;

-- ── storage: owners may manage product imagery ──────────────────────────────
drop policy if exists product_images_insert_owner on storage.objects;
drop policy if exists product_images_update_owner on storage.objects;
drop policy if exists product_images_delete_owner on storage.objects;

create policy product_images_insert_owner on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.fn_is_owner());

create policy product_images_update_owner on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.fn_is_owner());

create policy product_images_delete_owner on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.fn_is_owner());

-- ── execution grants ────────────────────────────────────────────────────────
revoke execute on function public.fn_set_role(text, public.app_role)                       from public;
revoke execute on function public.fn_owner_update_product(jsonb)                           from public;
revoke execute on function public.fn_owner_patch_product(text, numeric, integer, boolean)  from public;
revoke execute on function public.fn_owner_cancel_order(uuid, text)                        from public;
revoke execute on function public.fn_owner_upsert_courier(jsonb)                           from public;
revoke execute on function public.fn_owner_set_setting(text, jsonb)                        from public;
revoke execute on function public.fn_courier_claim_order(uuid)                             from public;
revoke execute on function public.fn_role()                                                from public;
revoke execute on function public.fn_is_owner()                                            from public;
revoke execute on function public.fn_my_courier()                                          from public;

grant execute on function public.fn_owner_update_product(jsonb)                           to authenticated;
grant execute on function public.fn_owner_patch_product(text, numeric, integer, boolean)  to authenticated;
grant execute on function public.fn_owner_cancel_order(uuid, text)                        to authenticated;
grant execute on function public.fn_owner_upsert_courier(jsonb)                           to authenticated;
grant execute on function public.fn_owner_set_setting(text, jsonb)                        to authenticated;
grant execute on function public.fn_courier_claim_order(uuid)                             to authenticated;
grant execute on function public.fn_role()                                                to authenticated;
grant execute on function public.fn_is_owner()                                            to authenticated;
grant execute on function public.fn_my_courier()                                          to authenticated;
-- fn_set_role stays service-role only: it is the one door into `owner`.
