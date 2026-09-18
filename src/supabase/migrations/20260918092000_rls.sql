-- ============================================================================
-- DOKHAN — 03 · privileges + row level security
-- Apply after 02. Supabase grants ALL on new public tables to anon/authenticated
-- by default, so every table is revoked first and then granted back narrowly.
-- Column-level grants are what stop a client writing points / age_verified /
-- stock; RLS is what stops it reading someone else's rows.
-- ============================================================================

revoke all on all tables in schema public from anon, authenticated;

alter table public.profiles              enable row level security;
alter table public.id_verifications      enable row level security;
alter table public.notification_prefs    enable row level security;
alter table public.device_tokens         enable row level security;
alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.product_specs         enable row level security;
alter table public.product_reviews       enable row level security;
alter table public.favorites             enable row level security;
alter table public.restock_watches       enable row level security;
alter table public.zones                 enable row level security;
alter table public.addresses             enable row level security;
alter table public.couriers              enable row level security;
alter table public.courier_locations     enable row level security;
alter table public.payment_methods       enable row level security;
alter table public.promotions            enable row level security;
alter table public.promotion_redemptions enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_events           enable row level security;
alter table public.loyalty_ledger        enable row level security;
alter table public.app_settings          enable row level security;
alter table public.support_tickets       enable row level security;
alter table public.support_messages      enable row level security;
alter table public.audit_log             enable row level security;

-- ── public catalog (readable without a session) ─────────────────────────────
grant select on public.categories, public.product_specs to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.zones to anon, authenticated;
grant select on public.app_settings to anon, authenticated;
grant select on public.promotions to anon, authenticated;
grant select on public.v_trending_products to anon, authenticated;

create policy categories_read on public.categories
  for select to anon, authenticated using (true);

create policy products_read on public.products
  for select to anon, authenticated using (is_active);

create policy product_specs_read on public.product_specs
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );

create policy zones_read on public.zones
  for select to anon, authenticated using (is_active);

create policy app_settings_read on public.app_settings
  for select to anon, authenticated using (true);

create policy promotions_read on public.promotions
  for select to anon, authenticated using (
    is_active and starts_at <= now() and (ends_at is null or ends_at > now())
  );

-- ── profiles ────────────────────────────────────────────────────────────────
-- Column grants: a member may rename themselves and change language/accent.
-- points, age_verified, id_last_four and is_blocked are server-owned.
grant select on public.profiles to authenticated;
grant update (name, locale, accent) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── identity documents ──────────────────────────────────────────────────────
grant select on public.id_verifications to authenticated;

create policy id_verifications_select_own on public.id_verifications
  for select to authenticated using (user_id = auth.uid());

-- ── notification prefs + device tokens ──────────────────────────────────────
grant select on public.notification_prefs to authenticated;
grant update (orders, offers, restock) on public.notification_prefs to authenticated;

create policy notification_prefs_own on public.notification_prefs
  for select to authenticated using (user_id = auth.uid());

create policy notification_prefs_update_own on public.notification_prefs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on public.device_tokens to authenticated;

create policy device_tokens_own on public.device_tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── favorites + restock watches ─────────────────────────────────────────────
grant select, insert, delete on public.favorites to authenticated;

create policy favorites_own on public.favorites
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on public.restock_watches to authenticated;

create policy restock_watches_own on public.restock_watches
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── reviews ─────────────────────────────────────────────────────────────────
grant select on public.product_reviews to anon, authenticated;
grant insert (product_id, user_id, rating, body) on public.product_reviews to authenticated;

create policy product_reviews_read on public.product_reviews
  for select to anon, authenticated using (true);

create policy product_reviews_insert_own on public.product_reviews
  for insert to authenticated with check (user_id = auth.uid());

-- ── addresses ───────────────────────────────────────────────────────────────
grant select, insert, delete on public.addresses to authenticated;
grant update (
  label_en, label_ar, line_en, line_ar, lat, lng, x, y,
  eta_minutes, kind, building, floor, apartment, landmark, note
) on public.addresses to authenticated;

create policy addresses_select_own on public.addresses
  for select to authenticated using (user_id = auth.uid());

create policy addresses_insert_own on public.addresses
  for insert to authenticated with check (user_id = auth.uid());

create policy addresses_update_own on public.addresses
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy addresses_delete_own on public.addresses
  for delete to authenticated using (user_id = auth.uid());

-- ── payment methods ─────────────────────────────────────────────────────────
-- is_default and provider_token are only ever written by the RPCs.
grant select, insert on public.payment_methods to authenticated;

create policy payment_methods_select_own on public.payment_methods
  for select to authenticated using (user_id = auth.uid());

create policy payment_methods_insert_own on public.payment_methods
  for insert to authenticated with check (user_id = auth.uid() and kind <> 'cash');

-- ── orders ──────────────────────────────────────────────────────────────────
-- Read-only for everyone: inserts happen inside fn_place_order, transitions
-- inside fn_advance_order_status.
grant select on public.orders, public.order_items, public.order_events to authenticated;

create policy orders_select_own on public.orders
  for select to authenticated using (
    user_id = auth.uid()
    or courier_id in (select c.id from public.couriers c where c.user_id = auth.uid())
  );

create policy order_items_select_own on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = auth.uid()
          or o.courier_id in (select c.id from public.couriers c where c.user_id = auth.uid())
        )
    )
  );

create policy order_events_select_own on public.order_events
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = auth.uid()
          or o.courier_id in (select c.id from public.couriers c where c.user_id = auth.uid())
        )
    )
  );

-- Dispatch queue for the courier app: unclaimed orders are visible to couriers.
create policy orders_select_dispatch on public.orders
  for select to authenticated using (
    courier_id is null and status = 'confirmed' and public.fn_is_courier()
  );

-- ── couriers ────────────────────────────────────────────────────────────────
grant select on public.couriers to authenticated;
grant update (status, zone_id) on public.couriers to authenticated;

create policy couriers_select_own on public.couriers
  for select to authenticated using (user_id = auth.uid());

create policy couriers_update_own on public.couriers
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert on public.courier_locations to authenticated;

create policy courier_locations_own on public.courier_locations
  for select to authenticated using (
    courier_id in (select c.id from public.couriers c where c.user_id = auth.uid())
  );

create policy courier_locations_insert_own on public.courier_locations
  for insert to authenticated with check (
    courier_id in (select c.id from public.couriers c where c.user_id = auth.uid())
  );

-- ── loyalty + promos + support ──────────────────────────────────────────────
grant select on public.loyalty_ledger to authenticated;

create policy loyalty_ledger_own on public.loyalty_ledger
  for select to authenticated using (user_id = auth.uid());

grant select on public.promotion_redemptions to authenticated;

create policy promotion_redemptions_own on public.promotion_redemptions
  for select to authenticated using (user_id = auth.uid());

grant select, insert on public.support_tickets to authenticated;

create policy support_tickets_own on public.support_tickets
  for select to authenticated using (user_id = auth.uid());

create policy support_tickets_insert_own on public.support_tickets
  for insert to authenticated with check (user_id = auth.uid());

grant select, insert on public.support_messages to authenticated;

create policy support_messages_own on public.support_messages
  for select to authenticated using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

create policy support_messages_insert_own on public.support_messages
  for insert to authenticated with check (
    author = 'member'
    and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

-- audit_log: no policies, no grants → service role only.

-- ── views ───────────────────────────────────────────────────────────────────
grant select on public.v_user_stats to authenticated;

-- ── function execution ──────────────────────────────────────────────────────
-- Revoke the implicit PUBLIC grant, then hand each RPC to signed-in members.
revoke execute on function public.fn_place_order(jsonb, jsonb, text, text) from public;
revoke execute on function public.fn_submit_identity(text) from public;
revoke execute on function public.fn_ensure_profile() from public;
revoke execute on function public.fn_set_default_payment_method(text) from public;
revoke execute on function public.fn_delete_payment_method(text) from public;
revoke execute on function public.fn_set_default_address(text) from public;
revoke execute on function public.fn_add_review_points(integer) from public;
revoke execute on function public.fn_advance_order_status(uuid, public.order_status) from public;
revoke execute on function public.fn_assign_courier(uuid, uuid) from public;
revoke execute on function public.fn_bootstrap_user(uuid, text, text) from public;
revoke execute on function public.fn_zone_for(numeric, numeric) from public;
revoke execute on function public.fn_setting(text, text) from public;
revoke execute on function public.fn_is_courier() from public;

grant execute on function public.fn_place_order(jsonb, jsonb, text, text) to authenticated;
grant execute on function public.fn_submit_identity(text) to authenticated;
grant execute on function public.fn_ensure_profile() to authenticated;
grant execute on function public.fn_set_default_payment_method(text) to authenticated;
grant execute on function public.fn_delete_payment_method(text) to authenticated;
grant execute on function public.fn_set_default_address(text) to authenticated;
grant execute on function public.fn_add_review_points(integer) to authenticated;
grant execute on function public.fn_advance_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.fn_assign_courier(uuid, uuid) to authenticated;
grant execute on function public.fn_is_courier() to authenticated;
