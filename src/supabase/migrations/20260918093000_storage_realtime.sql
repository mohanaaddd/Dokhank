-- ============================================================================
-- DOKHAN — 04 · storage buckets + realtime publication
-- Apply after 03.
-- ============================================================================

-- ── buckets ─────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('product-images',  'product-images',  true),
  ('avatars',         'avatars',         true),
  ('id-docs',         'id-docs',         false),
  ('delivery-proofs', 'delivery-proofs', false)
on conflict (id) do nothing;

-- Private buckets are addressed as `{user_id}/front.jpg`, so the first path
-- segment is the owner check.
create policy id_docs_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'id-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy id_docs_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'id-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Hand-off photos are written by couriers and read by ops only.
create policy delivery_proofs_insert_courier on storage.objects
  for insert to authenticated
  with check (bucket_id = 'delivery-proofs' and public.fn_is_courier());

create policy delivery_proofs_select_courier on storage.objects
  for select to authenticated
  using (bucket_id = 'delivery-proofs' and public.fn_is_courier());

-- ── realtime ────────────────────────────────────────────────────────────────
-- The tracking screen listens to `orders` for its own rows; `order_events`
-- carries the audit trail for the timeline.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
    ) then
      alter publication supabase_realtime add table public.orders;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_events'
    ) then
      alter publication supabase_realtime add table public.order_events;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'courier_locations'
    ) then
      alter publication supabase_realtime add table public.courier_locations;
    end if;
  end if;
end;
$$;
