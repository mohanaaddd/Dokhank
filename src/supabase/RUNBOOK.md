# Dokhan — backend runbook

Project: `iwwjbeiivtfxyujxmzma` → `https://iwwjbeiivtfxyujxmzma.supabase.co`

Everything the app needs is in this folder. Apply the files **in order**, then paste the anon key
into the client. Until the key is present the app keeps running on bundled mock data, so nothing
breaks half-way through.

---

## 1 · Apply the SQL

Dashboard → **SQL Editor** → paste each file, run, confirm success before the next one.

| # | File | What it does |
| --- | --- | --- |
| 1 | `migrations/20260918090000_schema.sql` | enums, 25 tables, indexes, `order_code_seq` |
| 2 | `migrations/20260918091000_views_functions.sql` | views, `fn_place_order`, signup trigger, loyalty triggers |
| 3 | `migrations/20260918092000_rls.sql` | revokes the default grants, adds column grants + RLS policies |
| 4 | `migrations/20260918093000_storage_realtime.sql` | 4 storage buckets, storage policies, realtime publication |
| 5 | `seed.sql` | categories, 14 products, 42 specs, 3 zones, 2 demo couriers, settings |
| 6 | `migrations/20260918094000_cron.sql` | **optional** — enable pg_cron first (Database → Extensions) |

Or, with the CLI: `supabase link --project-ref iwwjbeiivtfxyujxmzma && supabase db push && supabase db execute --file supabase/seed.sql`

No extensions are required for files 1–5: `gen_random_uuid()` and `sha256()` are core Postgres.

## 2 · Auth settings

Dashboard → **Authentication**:

- **Providers → Phone**: on. Add an SMS provider (Twilio / MessageBird, or a local aggregator such
  as SMSMisr via the Send SMS hook). Until one is attached, real OTP cannot be delivered.
- **Providers → Email**: on, and turn **"Confirm email" OFF**. This is what the dev bypass rides on;
  it maps a phone number to a synthetic `eg<digits>@dokhan.dev` account so the session, profile row
  and every RLS policy behave exactly as they will in production.
- **URL configuration**: add the published app URL.

## 3 · Connect the client

`lib/supabaseConfig.ts`:

```ts
export const SUPABASE_ANON_KEY = 'eyJ...'   // Project Settings → API → anon public
export const DEV_OTP_BYPASS = true          // set false once SMS is live
```

That single line flips the whole app from mock to live. The service-role key is never used by the
client — keep it for Edge Functions only.

## 4 · Smoke test

1. Sign in with any valid Egyptian number (`10 1234 5678`) and code `1234`.
2. Onboarding asks for a national ID. Use a real-format 14-digit number that is 18+ —
   e.g. `29001011234567` (born 1990-01-01). `fn_submit_identity` parses the date of birth out of the
   ID, stores only a salted SHA-256 plus the last four, and flips `age_verified`.
3. Add to cart → pick an address → place the order. The order code comes back as `#EG2482`.
4. Advance the order the way the courier app will:
   ```sql
   select public.fn_advance_order_status('<order-id>', 'packing');
   select public.fn_advance_order_status('<order-id>', 'on_the_way');
   select public.fn_advance_order_status('<order-id>', 'delivered');
   ```
   Run these from the SQL editor (service role) and watch the tracking screen move within ~1s over
   Realtime. On `delivered` the loyalty trigger credits `floor(total / 10)` points.

## 5 · Acceptance checks

```sql
-- RLS on every table, no exceptions
select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;   -- expect 0 rows

-- the anon key can read nothing private
set role anon;
select count(*) from public.orders;        -- 0
select count(*) from public.profiles;      -- 0
select count(*) from public.products;      -- 14
reset role;

-- exactly one default payment method and one default address per member
select user_id, count(*) from public.payment_methods where is_default group by 1 having count(*) <> 1;
select user_id, count(*) from public.addresses      where is_default group by 1 having count(*) <> 1;

-- concurrent orders cannot oversell: stock is decremented under `select … for update`
select id, stock from public.products order by stock limit 5;
```

## 6 · What is deliberately not built yet

| Area | State | Why |
| --- | --- | --- |
| Paymob card capture | `payment_methods.provider_token` + `flags.paymob` exist; no Edge Function | needs merchant credentials |
| ID image upload | `id-docs` bucket + policies exist; the app captures no file yet | the onboarding screen mocks the camera |
| Push (FCM/APNs) | `device_tokens` + `notification_prefs` ready | needs a service account |
| SMS aggregator | Auth hook slot | pricing decision |
| Courier app | separate project — see `courier.md` | different auth role, GPS foreground service |

## 7 · Deviations from the handbook (all deliberate)

- **`addresses.id` is `text`, not `uuid`.** The app mints `addr_*` ids client-side when the pin is
  dropped and reuses the same id when the order is placed; a text key keeps the frontend contract
  byte-for-byte intact.
- **`couriers.id` is its own uuid with a nullable `user_id`.** Dispatch can be seeded and tested
  before any courier account exists.
- **Zones test a bounding box** (`min_lat`/`max_lat`/`min_lng`/`max_lng`) instead of a polygon, so no
  PostGIS is needed. The `polygon` column is kept for the upgrade.
- **The courier is snapshotted onto the order** (`orders.courier_snapshot`) rather than exposed
  through a view, so the customer bundle never reads the `couriers` table.
- **Opening hours are recorded but not enforced** until `app_settings.delivery.enforce_hours` is
  set to `true` — otherwise every test outside 10:00–02:00 Cairo would be rejected.
- **`fn_place_order` takes the address as JSON**, not an id, and upserts it. The address may have
  been created moments earlier in an optimistic client write.
- **National IDs are hashed with core `sha256()` + a fixed salt.** Swap in pgcrypto HMAC with a
  secret from Vault when the ID pipeline goes live.
