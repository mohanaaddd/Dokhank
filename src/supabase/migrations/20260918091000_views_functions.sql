-- ============================================================================
-- DOKHAN — 02 · views, functions, triggers
-- Apply after 01_schema. All business writes go through these functions; the
-- client only ever SELECTs, or writes its own addresses / favorites / prefs.
-- ============================================================================

-- ── helpers ─────────────────────────────────────────────────────────────────
create or replace function public.fn_is_service()
returns boolean
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  ) = 'service_role';
$$;

create or replace function public.fn_is_courier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.couriers c where c.user_id = auth.uid());
$$;

create or replace function public.fn_initials(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v_parts text[];
  v_out   text;
begin
  v_parts := regexp_split_to_array(btrim(coalesce(p_name, '')), '\s+');
  if array_length(v_parts, 1) is null or v_parts[1] = '' then
    return 'DK';
  end if;
  if array_length(v_parts, 1) > 1 then
    v_out := left(v_parts[1], 1) || left(v_parts[2], 1);
  else
    v_out := left(v_parts[1], 2);
  end if;
  return upper(v_out);
end;
$$;

-- Picks the zone containing the pin, falling back to the city-wide zone.
create or replace function public.fn_zone_for(p_lat numeric, p_lng numeric)
returns public.zones
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_zone public.zones;
begin
  if p_lat is not null and p_lng is not null then
    select * into v_zone
    from public.zones
    where is_active
      and p_lat between min_lat and max_lat
      and p_lng between min_lng and max_lng
    order by sort_order
    limit 1;
    if found then
      return v_zone;
    end if;
  end if;

  select * into v_zone from public.zones where is_active order by sort_order limit 1;
  return v_zone;
end;
$$;

-- Returns the setting as text so it casts cleanly whether the JSON value was
-- written as a number/boolean or as a quoted string.
create or replace function public.fn_setting(p_key text, p_field text)
returns text
language sql
stable
security definer
set search_path = public
as $
  select value ->> p_field from public.app_settings where key = p_key;
$;

-- ── views ───────────────────────────────────────────────────────────────────
-- security_invoker keeps RLS in force, so a member only ever sees their own row.
create view public.v_user_stats with (security_invoker = true) as
select p.id as user_id,
       p.points,
       count(o.id) filter (where o.status = 'delivered') as delivered_orders_count,
       count(o.id) filter (where o.status <> 'cancelled') as orders_count
from public.profiles p
left join public.orders o on o.user_id = p.id
group by p.id, p.points;

create materialized view public.v_trending_products as
select p.id,
       count(oi.id) as sold_30d
from public.products p
left join public.order_items oi on oi.product_id = p.id
left join public.orders o
       on o.id = oi.order_id
      and o.placed_at > now() - interval '30 days'
      and o.status <> 'cancelled'
where p.is_active
group by p.id;

create unique index v_trending_products_id_idx on public.v_trending_products (id);

-- ── signup bootstrap ────────────────────────────────────────────────────────
-- Every account gets a profile, notification prefs and the non-removable cash
-- payment method. The UI assumes exactly one default method always exists.
create or replace function public.fn_bootstrap_user(p_user_id uuid, p_phone text, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, phone, name, initials)
    values (p_user_id, p_phone, p_name, public.fn_initials(p_name))
    on conflict (id) do nothing;
  exception when unique_violation then
    -- Same phone already claimed by another account: keep the row unique.
    insert into public.profiles (id, phone, name, initials)
    values (p_user_id, p_phone || '#' || left(p_user_id::text, 8), p_name, public.fn_initials(p_name))
    on conflict (id) do nothing;
  end;

  insert into public.notification_prefs (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.payment_methods (user_id, kind, removable, is_default)
  select p_user_id, 'cash', false, true
  where not exists (
    select 1 from public.payment_methods where user_id = p_user_id and kind = 'cash'
  );
end;
$$;

create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_name  text;
begin
  v_phone := coalesce(
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case
      when new.phone is not null and new.phone <> ''
      then '+' || regexp_replace(new.phone, '\D', '', 'g')
    end,
    new.email,
    'unknown-' || left(new.id::text, 8)
  );
  v_name := coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Dokhan');

  perform public.fn_bootstrap_user(new.id, v_phone, v_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();

-- Idempotent safety net for accounts created before this migration ran.
create or replace function public.fn_ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_user  record;
  v_phone text;
  v_name  text;
begin
  if v_uid is null then
    return;
  end if;

  select u.phone, u.email, u.raw_user_meta_data
    into v_user
  from auth.users u
  where u.id = v_uid;

  if not found then
    return;
  end if;

  v_phone := coalesce(
    nullif(v_user.raw_user_meta_data ->> 'phone', ''),
    case
      when v_user.phone is not null and v_user.phone <> ''
      then '+' || regexp_replace(v_user.phone, '\D', '', 'g')
    end,
    v_user.email,
    'unknown-' || left(v_uid::text, 8)
  );
  v_name := coalesce(nullif(v_user.raw_user_meta_data ->> 'name', ''), 'Dokhan');

  perform public.fn_bootstrap_user(v_uid, v_phone, v_name);
end;
$$;

-- ── 18+ gate ────────────────────────────────────────────────────────────────
-- Egyptian national ID: C YY MM DD GG SSS X — the first digit is the century
-- (2 = 1900s, 3 = 2000s) and digits 2-7 are the date of birth. The raw 14
-- digits are never stored; only a salted SHA-256 and the last four.
create or replace function public.fn_submit_identity(p_national_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_digits  text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_century integer;
  v_dob     date;
  v_age     integer;
  v_hash    text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if length(v_digits) <> 14 then
    return jsonb_build_object('status', 'rejected', 'reason', 'idNumberError');
  end if;

  v_century := case left(v_digits, 1) when '2' then 1900 when '3' then 2000 else null end;
  if v_century is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'idNumberError');
  end if;

  begin
    v_dob := make_date(
      v_century + substr(v_digits, 2, 2)::integer,
      substr(v_digits, 4, 2)::integer,
      substr(v_digits, 6, 2)::integer
    );
  exception when others then
    return jsonb_build_object('status', 'rejected', 'reason', 'idNumberError');
  end;

  if v_dob > current_date then
    return jsonb_build_object('status', 'rejected', 'reason', 'idNumberError');
  end if;

  v_age := date_part('year', age(current_date, v_dob))::integer;
  v_hash := encode(sha256(convert_to(v_digits || 'dokhan.id.v1', 'utf8')), 'hex');

  if v_age < 18 then
    insert into public.id_verifications (user_id, national_id_hash, last_four, status, reject_reason, reviewed_at)
    values (v_uid, v_hash, right(v_digits, 4), 'rejected', 'underage', now());
    return jsonb_build_object('status', 'rejected', 'reason', 'ageBlocked');
  end if;

  insert into public.id_verifications (user_id, national_id_hash, last_four, status, reviewed_at)
  values (v_uid, v_hash, right(v_digits, 4), 'approved', now());

  update public.profiles
  set age_verified = true,
      id_last_four = right(v_digits, 4)
  where id = v_uid;

  return jsonb_build_object('status', 'approved', 'last_four', right(v_digits, 4));
end;
$$;

-- ── payment methods ─────────────────────────────────────────────────────────
create or replace function public.fn_set_default_payment_method(p_method_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_method_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'METHOD_NOT_FOUND' using errcode = '22023';
  end if;

  select id into v_id from public.payment_methods
  where id = p_method_id::uuid and user_id = v_uid;

  if v_id is null then
    raise exception 'METHOD_NOT_FOUND' using errcode = '22023';
  end if;

  update public.payment_methods set is_default = false
  where user_id = v_uid and is_default and id <> v_id;

  update public.payment_methods set is_default = true where id = v_id;
end;
$$;

create or replace function public.fn_delete_payment_method(p_method_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_method public.payment_methods;
  v_next   uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_method_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'METHOD_NOT_FOUND' using errcode = '22023';
  end if;

  select * into v_method from public.payment_methods
  where id = p_method_id::uuid and user_id = v_uid;

  if not found then
    raise exception 'METHOD_NOT_FOUND' using errcode = '22023';
  end if;
  if not v_method.removable then
    raise exception 'METHOD_NOT_REMOVABLE' using errcode = '22023';
  end if;

  delete from public.payment_methods where id = v_method.id;

  if v_method.is_default then
    -- The cash row is the guaranteed fallback default.
    select id into v_next from public.payment_methods
    where user_id = v_uid
    order by (kind = 'cash') desc, created_at
    limit 1;

    if v_next is not null then
      update public.payment_methods set is_default = true where id = v_next;
    end if;
  end if;
end;
$$;

-- ── addresses ───────────────────────────────────────────────────────────────
create or replace function public.fn_set_default_address(p_address_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select id into v_id from public.addresses where id = p_address_id and user_id = v_uid;
  if v_id is null then
    raise exception 'ADDRESS_NOT_FOUND' using errcode = '22023';
  end if;

  update public.addresses set is_default = false
  where user_id = v_uid and is_default and id <> v_id;

  update public.addresses set is_default = true where id = v_id;
end;
$$;

-- First address a member saves becomes their default, and the zone is resolved
-- from the dropped pin.
create or replace function public.trg_address_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.lat is not null and new.lng is not null then
    new.zone_id := (public.fn_zone_for(new.lat, new.lng)).id;
  end if;

  if not exists (
    select 1 from public.addresses
    where user_id = new.user_id and is_default and id <> new.id
  ) then
    new.is_default := true;
  end if;

  return new;
end;
$$;

create trigger addresses_defaults
  before insert on public.addresses
  for each row execute function public.trg_address_defaults();

-- ── ordering ────────────────────────────────────────────────────────────────
-- Single transaction. Stock, totals, fees and discounts are all recomputed
-- here; nothing the client sends about money is trusted.
create or replace function public.fn_place_order(
  p_items             jsonb,
  p_address           jsonb,
  p_payment_method_id text default null,
  p_promo_code        text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_profile  public.profiles;
  v_addr     public.addresses;
  v_addr_id  text;
  v_zone     public.zones;
  v_method   public.payment_methods;
  v_courier  public.couriers;
  v_promo    public.promotions;
  v_product  public.products;
  v_item     record;
  v_priced   jsonb := '[]'::jsonb;
  v_subtotal numeric(10,2) := 0;
  v_fee      numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_free_over numeric(10,2);
  v_flat_fee numeric(10,2);
  v_enforce  boolean;
  v_now      time;
  v_open     boolean;
  v_order    public.orders;
  v_snapshot jsonb;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'PROFILE_MISSING' using errcode = '22023';
  end if;
  if v_profile.is_blocked then
    raise exception 'ACCOUNT_BLOCKED' using errcode = '42501';
  end if;
  if not v_profile.age_verified then
    raise exception 'AGE_NOT_VERIFIED' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CART_EMPTY' using errcode = '22023';
  end if;
  if p_address is null or jsonb_typeof(p_address) <> 'object' then
    raise exception 'ADDRESS_REQUIRED' using errcode = '22023';
  end if;

  -- 1 · address: upsert the pin the member just used, then freeze a snapshot.
  v_addr_id := coalesce(
    nullif(p_address ->> 'id', ''),
    'addr_' || replace(gen_random_uuid()::text, '-', '')
  );

  select * into v_addr from public.addresses where id = v_addr_id;
  if found and v_addr.user_id <> v_uid then
    raise exception 'ADDRESS_FORBIDDEN' using errcode = '42501';
  end if;

  if found then
    update public.addresses set
      label_en    = coalesce(nullif(p_address ->> 'label_en', ''), label_en),
      label_ar    = coalesce(nullif(p_address ->> 'label_ar', ''), label_ar),
      line_en     = coalesce(nullif(p_address ->> 'line_en', ''), line_en),
      line_ar     = coalesce(nullif(p_address ->> 'line_ar', ''), line_ar),
      x           = coalesce((p_address ->> 'x')::numeric, x),
      y           = coalesce((p_address ->> 'y')::numeric, y),
      lat         = coalesce((p_address ->> 'lat')::numeric, lat),
      lng         = coalesce((p_address ->> 'lng')::numeric, lng),
      eta_minutes = coalesce((p_address ->> 'eta_minutes')::integer, eta_minutes),
      kind        = coalesce((p_address ->> 'kind')::public.address_kind, kind),
      building    = nullif(p_address ->> 'building', ''),
      floor       = nullif(p_address ->> 'floor', ''),
      apartment   = nullif(p_address ->> 'apartment', ''),
      landmark    = nullif(p_address ->> 'landmark', ''),
      note        = nullif(p_address ->> 'note', '')
    where id = v_addr_id
    returning * into v_addr;
  else
    insert into public.addresses (
      id, user_id, label_en, label_ar, line_en, line_ar,
      x, y, lat, lng, eta_minutes, kind, building, floor, apartment, landmark, note
    ) values (
      v_addr_id,
      v_uid,
      coalesce(nullif(p_address ->> 'label_en', ''), 'Address'),
      coalesce(nullif(p_address ->> 'label_ar', ''), nullif(p_address ->> 'label_en', ''), 'Address'),
      coalesce(p_address ->> 'line_en', ''),
      coalesce(nullif(p_address ->> 'line_ar', ''), coalesce(p_address ->> 'line_en', '')),
      least(1, greatest(0, coalesce((p_address ->> 'x')::numeric, 0.5))),
      least(1, greatest(0, coalesce((p_address ->> 'y')::numeric, 0.5))),
      (p_address ->> 'lat')::numeric,
      (p_address ->> 'lng')::numeric,
      greatest(1, coalesce((p_address ->> 'eta_minutes')::integer, 25)),
      coalesce((p_address ->> 'kind')::public.address_kind, 'other'),
      nullif(p_address ->> 'building', ''),
      nullif(p_address ->> 'floor', ''),
      nullif(p_address ->> 'apartment', ''),
      nullif(p_address ->> 'landmark', ''),
      nullif(p_address ->> 'note', '')
    )
    returning * into v_addr;
  end if;

  -- 2 · zone + opening hours (hours are only enforced when the flag is on).
  v_zone := public.fn_zone_for(v_addr.lat, v_addr.lng);
  if v_zone.id is null then
    raise exception 'ZONE_UNAVAILABLE' using errcode = '22023';
  end if;

  v_enforce := coalesce(public.fn_setting('delivery', 'enforce_hours')::boolean, false);
  if v_enforce then
    v_now := (now() at time zone 'Africa/Cairo')::time;
    v_open := case
      when v_zone.opens_at <= v_zone.closes_at then v_now between v_zone.opens_at and v_zone.closes_at
      else v_now >= v_zone.opens_at or v_now <= v_zone.closes_at
    end;
    if not v_open then
      raise exception 'ZONE_CLOSED' using errcode = '22023';
    end if;
  end if;

  -- 3 · lock the products, assert stock, price the lines, decrement.
  for v_item in
    select e ->> 'product_id' as product_id,
           greatest(1, coalesce((e ->> 'quantity')::integer, 1)) as quantity
    from jsonb_array_elements(p_items) e
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id and is_active
    for update;

    if not found then
      raise exception 'PRODUCT_UNAVAILABLE:%', v_item.product_id using errcode = '22023';
    end if;
    if v_product.stock < v_item.quantity then
      raise exception 'OUT_OF_STOCK:%', v_product.id using errcode = '22023';
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_item.quantity);
    v_priced := v_priced || jsonb_build_object(
      'product_id', v_product.id,
      'quantity',   v_item.quantity,
      'unit_price', v_product.price,
      'name_en',    v_product.name_en,
      'name_ar',    v_product.name_ar
    );

    update public.products set stock = stock - v_item.quantity where id = v_product.id;
  end loop;

  -- 4 · delivery fee + promotion, recomputed server-side.
  v_flat_fee  := coalesce(public.fn_setting('delivery', 'fee')::numeric, 25);
  v_free_over := coalesce(public.fn_setting('delivery', 'free_over')::numeric, 500);
  v_fee := case
    when v_subtotal >= v_free_over then 0
    else coalesce(v_zone.delivery_fee, v_flat_fee)
  end;

  if p_promo_code is not null and btrim(p_promo_code) <> '' then
    select * into v_promo
    from public.promotions
    where upper(code) = upper(btrim(p_promo_code))
      and is_active
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
      and (max_uses is null or uses < max_uses)
      and min_subtotal <= v_subtotal
    for update;

    if found then
      v_discount := least(
        v_subtotal,
        coalesce(v_promo.amount_off, round(v_subtotal * v_promo.percent_off / 100, 2))
      );
      update public.promotions set uses = uses + 1 where id = v_promo.id;
    end if;
  end if;

  -- 5 · payment method: fall back to the member's default, then to cash.
  if p_payment_method_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into v_method from public.payment_methods
    where id = p_payment_method_id::uuid and user_id = v_uid;
  end if;

  if v_method.id is null then
    select * into v_method from public.payment_methods
    where user_id = v_uid
    order by is_default desc, (kind = 'cash') desc, created_at
    limit 1;
  end if;

  if v_method.id is null then
    insert into public.payment_methods (user_id, kind, removable, is_default)
    values (v_uid, 'cash', false, true)
    returning * into v_method;
  end if;

  -- 6 · dispatch: any courier working this zone, snapshotted onto the order so
  -- the customer app never has to read the couriers table.
  select * into v_courier
  from public.couriers
  where status <> 'offline'
    and (zone_id is null or zone_id = v_zone.id)
  order by random()
  limit 1;

  -- 7 · the order itself.
  v_snapshot := jsonb_strip_nulls(jsonb_build_object(
    'id',          v_addr.id,
    'label',       jsonb_build_object('en', v_addr.label_en, 'ar', v_addr.label_ar),
    'line',        jsonb_build_object('en', v_addr.line_en, 'ar', v_addr.line_ar),
    'x',           v_addr.x,
    'y',           v_addr.y,
    'etaMinutes',  v_addr.eta_minutes,
    'kind',        v_addr.kind,
    'building',    v_addr.building,
    'floor',       v_addr.floor,
    'apartment',   v_addr.apartment,
    'landmark',    v_addr.landmark,
    'note',        v_addr.note
  ));

  insert into public.orders (
    code, user_id, courier_id, address_id, address_snapshot, courier_snapshot,
    payment_method_id, payment_kind, promotion_id,
    subtotal, delivery_fee, discount, total, status, eta_minutes
  ) values (
    '#EG' || lpad(nextval('public.order_code_seq')::text, 4, '0'),
    v_uid,
    v_courier.id,
    v_addr.id,
    v_snapshot,
    case
      when v_courier.id is null then null
      else jsonb_build_object('name', v_courier.name, 'vehicle', v_courier.vehicle, 'initials', v_courier.initials)
    end,
    v_method.id,
    v_method.kind,
    v_promo.id,
    v_subtotal,
    v_fee,
    v_discount,
    greatest(0, v_subtotal + v_fee - v_discount),
    'confirmed',
    v_addr.eta_minutes
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, quantity, unit_price, name_en, name_ar)
  select v_order.id,
         e ->> 'product_id',
         (e ->> 'quantity')::integer,
         (e ->> 'unit_price')::numeric,
         e ->> 'name_en',
         e ->> 'name_ar'
  from jsonb_array_elements(v_priced) e;

  insert into public.order_events (order_id, status, actor)
  values (v_order.id, 'confirmed', 'system');

  if v_promo.id is not null then
    insert into public.promotion_redemptions (promotion_id, user_id, order_id)
    values (v_promo.id, v_uid, v_order.id);
  end if;

  return jsonb_build_object(
    'id',                v_order.id,
    'code',              v_order.code,
    'subtotal',          v_order.subtotal,
    'delivery_fee',      v_order.delivery_fee,
    'discount',          v_order.discount,
    'total',             v_order.total,
    'address_snapshot',  v_order.address_snapshot,
    'courier_snapshot',  v_order.courier_snapshot,
    'payment_method_id', v_order.payment_method_id,
    'payment_kind',      v_order.payment_kind,
    'status',            v_order.status,
    'eta_minutes',       v_order.eta_minutes,
    'points_earned',     v_order.points_earned,
    'placed_at',         v_order.placed_at,
    'delivered_at',      v_order.delivered_at,
    'order_items', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'product_id', oi.product_id,
          'quantity',   oi.quantity,
          'unit_price', oi.unit_price
        ) order by oi.id),
        '[]'::jsonb
      )
      from public.order_items oi
      where oi.order_id = v_order.id
    )
  );
end;
$$;

-- ── status transitions (courier app / ops) ──────────────────────────────────
create or replace function public.fn_advance_order_status(p_order_id uuid, p_status public.order_status)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   public.orders;
  v_courier public.couriers;
  v_allowed boolean;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = '22023';
  end if;

  select * into v_courier from public.couriers where user_id = auth.uid();

  if not public.fn_is_service() and (v_courier.id is null or v_order.courier_id is distinct from v_courier.id) then
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
  values (v_order.id, p_status, case when v_courier.id is null then 'system' else 'courier' end);

  return jsonb_build_object('id', v_order.id, 'status', v_order.status, 'delivered_at', v_order.delivered_at);
end;
$$;

create or replace function public.fn_assign_courier(p_order_id uuid, p_courier_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_courier public.couriers;
begin
  if not public.fn_is_service() and not public.fn_is_courier() then
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
end;
$$;

-- ── loyalty ─────────────────────────────────────────────────────────────────
create or replace function public.trg_order_delivery_stamp()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    new.delivered_at := coalesce(new.delivered_at, now());
    new.points_earned := floor(new.total / 10)::integer;
  end if;
  return new;
end;
$$;

create trigger orders_delivery_stamp
  before update on public.orders
  for each row execute function public.trg_order_delivery_stamp();

create or replace function public.trg_award_points_on_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' and new.points_earned > 0 then
    insert into public.loyalty_ledger (user_id, order_id, delta, reason)
    values (new.user_id, new.id, new.points_earned, 'order');

    update public.profiles
    set points = points + new.points_earned
    where id = new.user_id;
  end if;
  return null;
end;
$$;

create trigger orders_award_points
  after update on public.orders
  for each row execute function public.trg_award_points_on_delivery();

-- Small, capped bonus for rating a delivery. The client can ask, never dictate.
create or replace function public.fn_add_review_points(p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_amount  integer := least(greatest(coalesce(p_amount, 0), 0), 5);
  v_earned  integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if v_amount = 0 then
    return 0;
  end if;

  select coalesce(sum(delta), 0) into v_earned
  from public.loyalty_ledger
  where user_id = v_uid and reason = 'review';

  -- Hard lifetime cap so a loop in the client can never mint points.
  if v_earned + v_amount > 100 then
    return 0;
  end if;

  insert into public.loyalty_ledger (user_id, delta, reason) values (v_uid, v_amount, 'review');
  update public.profiles set points = points + v_amount where id = v_uid;

  return v_amount;
end;
$$;
