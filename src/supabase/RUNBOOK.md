# Dokhan — backend runbook

Project: `iwwjbeiivtfxyujxmzma` → `https://iwwjbeiivtfxyujxmzma.supabase.co`

Everything the app needs is in this folder. There are **seven** SQL files and they must be applied
in order. Sign-in runs on real Supabase phone OTP, so an SMS provider is required before anyone can
log in (§3).

> **Rotate your keys.** The service-role key and personal access token were pasted into a chat.
> Dashboard → Project Settings → API → *Reveal / Generate new* service role key, and Account →
> Access Tokens → revoke the old token. The anon key in `lib/supabaseConfig.ts` is fine to keep —
> it is meant to ship in the bundle.

---

## 1 · Apply the SQL

Dashboard → **SQL Editor** → paste each file, run, confirm success before the next one.

| # | File | What it does |
| --- | --- | --- |
| 1 | `migrations/20260918090000_schema.sql` | enums, 25 tables, indexes, `order_code_seq` |
| 2 | `migrations/20260918091000_views_functions.sql` | views, `fn_place_order`, signup trigger, loyalty triggers |
| 3 | `migrations/20260918092000_rls.sql` | revokes the default grants, adds column grants + RLS policies |
| 4 | `migrations/20260918093000_storage_realtime.sql` | 4 storage buckets, storage policies, realtime publication |
| 5 | `migrations/20260919090000_roles_owner.sql` | `app_role` enum, `profiles.role`, owner/courier guards, owner views + write RPCs, `product-images` upload policy |
| 6 | `seed.sql` | categories, 14 products, 42 specs, 3 zones, 2 demo couriers, settings |
| 7 | `migrations/20260918094000_cron.sql` | **optional** — enable pg_cron first (Database → Extensions) |

Or, with the CLI: `supabase link --project-ref iwwjbeiivtfxyujxmzma && supabase db push && supabase db execute --file supabase/seed.sql`

No extensions are required for files 1–6: `gen_random_uuid()` and `sha256()` are core Postgres.

### 1a · Re-applying over a database you already loaded

Files 1–4 are **not** re-runnable on their own: their `create type`, `create table`, `create view`,
`create trigger` and `create policy` statements have no `if not exists` guard, so a second run
aborts on the first duplicate. File 5, `seed.sql` and the cron file are idempotent and can be
re-run freely.

To overwrite cleanly, run **`RESET.sql` first**, then files 1 → 7 again:

```text
RESET.sql   →  drops the signup trigger, this project's storage policies,
               any scheduled cron jobs, and `schema public` (cascade),
               then recreates the empty schema with the standard grants.
```

`RESET.sql` destroys all application data — orders, addresses, profiles, catalog edits. It leaves
`auth.users`, the storage buckets and the files inside them untouched; two commented blocks at the
bottom of the file wipe those too if you want a truly blank project. Existing accounts survive a
reset and get a fresh `profiles` row on their next sign-in via `fn_ensure_profile` — but they come
back as `customer`, so **re-run the owner promotion in §4** afterwards.

## 2 · Roles

`profiles.role` is an `app_role` (`customer` | `courier` | `owner`) and is **server-owned**: no
grant or policy lets a client write it. The column decides which of the three shells the app mounts
at sign-in, and `fn_is_owner()` / `fn_is_courier()` gate every ops read and write in the database.

## 3 · Auth settings

Dashboard → **Authentication**:

- **Providers → Phone: ON.** Attach an SMS provider — Twilio, Twilio Verify, MessageBird, Vonage, or
  a local Egyptian aggregator (SMSMisr, Victory Link) through the *Send SMS* auth hook. **Without a
  provider, no one can sign in**: there is no fallback in the client any more.
- **Phone → OTP length: 6**, expiry 600s. If you change the length, change `OTP_LENGTH` in
  `lib/supabaseConfig.ts` to match — the code boxes are generated from it.
- **Phone → "Confirm phone" / enable phone signups: ON.** The first OTP doubles as sign-up
  (`shouldCreateUser: true`), and the `on_auth_user_created` trigger mints the `profiles` row from
  `auth.users.phone`.
- **Rate limits** (Auth → Rate Limits): the default is 30 SMS/hour per project. The resend button in
  the app enforces a 60s cooldown client-side; the server is still the authority and its "for
  security purposes" error is surfaced as *Too many attempts*.
- **Providers → Email**: only needed if you turn the offline bypass back on (`DEV_OTP_BYPASS = true`
  in `lib/supabaseConfig.ts`, which maps a phone to a synthetic `eg<digits>@dokhan.dev` account).
  That path needs **"Confirm email" OFF**. It is off by default now.
- **URL configuration**: add the published app URL.

Testing without spending SMS: Auth → Providers → Phone → **Test OTP** lets you register a fixed
number/code pair (e.g. `201012345678` → `123456`) that verifies without sending anything.

## 4 · Make yourself the owner

Sign in once on the phone number you want to own the store, then run this from the SQL editor
(service role — the RPC refuses anyone else):

```sql
select public.fn_set_role('+201012345678', 'owner');   -- or just the trailing digits
select public.fn_set_role('+201099999999', 'courier'); -- for a rider account
```

Sign out and back in (or reload) and the owner console replaces the shop. This is the only door into
it — there is no in-app promotion path by design.

## 5 · Smoke test

1. **Customer:** sign in with a real Egyptian number, receive the 6-digit SMS, verify.
2. Onboarding asks for a national ID. Use a real-format 14-digit number that is 18+ —
   e.g. `29001011234567` (born 1990-01-01). `fn_submit_identity` parses the date of birth out of the
   ID, stores only a salted SHA-256 plus the last four, and flips `age_verified`.
3. Add to cart → pick an address → place the order. The order code comes back as `#EG2482`.
4. **Owner:** on the owner account, the new order appears on the board within ~1s over Realtime.
   Assign a courier, then advance it.
5. **Courier:** on the courier account, go on shift, claim the order, walk it PACKED → ON THE WAY →
   DELIVERED, and watch the customer's tracking screen follow live. On `delivered` the loyalty
   trigger credits `floor(total / 10)` points.
6. **Cancel path:** from owner → order detail → cancel. Stock is returned by `fn_owner_cancel_order`
   and the customer's timeline shows the cancelled node with the reason.

Manual equivalents, if you want to drive it from SQL instead:

```sql
select public.fn_assign_courier('<order-id>', '<courier-id>');
select public.fn_advance_order_status('<order-id>', 'packing');
select public.fn_advance_order_status('<order-id>', 'on_the_way');
select public.fn_advance_order_status('<order-id>', 'delivered');
select public.fn_owner_cancel_order('<order-id>', 'Out of stock');
```

## 6 · Acceptance checks

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

-- nobody can promote themselves
select count(*) from information_schema.column_privileges
where table_name = 'profiles' and column_name = 'role' and grantee in ('anon','authenticated')
  and privilege_type in ('INSERT','UPDATE');                                -- expect 0

-- exactly one default payment method and one default address per member
select user_id, count(*) from public.payment_methods where is_default group by 1 having count(*) <> 1;
select user_id, count(*) from public.addresses      where is_default group by 1 having count(*) <> 1;

-- concurrent orders cannot oversell: stock is decremented under `select … for update`
select id, stock from public.products order by stock limit 5;

-- who has elevated access
select phone, role from public.profiles where role <> 'customer';
```

## 7 · What is deliberately not built yet

| Area | State | Why |
| --- | --- | --- |
| Paymob card capture | `payment_methods.provider_token` + `flags.paymob` exist; no Edge Function | needs merchant credentials |
| ID image upload | `id-docs` bucket + policies exist; the app captures no file yet | the onboarding screen mocks the camera |
| Push (FCM/APNs) | `device_tokens` + `notification_prefs` ready | needs a service account |
| Courier GPS trail | `courier_locations` table + realtime ready; the app writes no fixes | needs the Capacitor background-location plugin |
| Courier app | runs inside this bundle on the courier role — see `courier.md` for the standalone brief | one codebase is cheaper for now |

## 8 · Deviations from the handbook (all deliberate)

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
