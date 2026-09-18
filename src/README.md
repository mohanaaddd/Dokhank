# DOKHAN — Backend Handbook (for Claude)

> **Status: built.** The Supabase layer described below now exists in `supabase/` (4 migrations +
> `seed.sql` + an optional cron file) and the data layer in `lib/`. Every context provider and
> `hooks/useCatalog.ts` now read the real backend, with identical exports. No frontend file was
> touched.
>
> - **To go live:** follow `supabase/RUNBOOK.md` — apply the SQL in order, set the Auth options,
>   then paste the anon key into `lib/supabaseConfig.ts`. Before the key is set, the app runs on the
>   bundled mock data exactly as it did before, so nothing is ever half-broken.
> - **Courier app:** `courier.md` is the self-contained brief for the separate rider project on the
>   same database.
> - **Deliberate deviations** from the tree below (text address ids, bounding-box zones, courier
>   snapshots) are listed in §7 of the runbook.

Dokhan is an 18+ tobacco / vape / IQOS delivery app for Egypt (Cairo first). The **entire frontend
already exists** in this repo as a React + TypeScript + Tailwind prototype with mocked data held in
React contexts.

## Rules of engagement

1. **Do not edit any frontend file.** No changes to `pages/**`, `components/**`, `App.tsx`,
   `index.css`, `tailwind.config.js`, or any copy in `data/locales/**`.
2. You **may** replace the bodies of the files listed in [Frontend contract](#frontend-contract) —
   the context providers and `hooks/useCatalog.ts` — so they call the real backend instead of mock
   state. **Their exported names, value shapes, and types must stay byte-for-byte compatible.**
   Types live in `types/index.ts`; treat that file as the API contract, and only add fields.
3. You **may** add new files under `lib/` (Supabase client, generated DB types, query helpers) and
   `supabase/` (migrations, functions, seeds).
4. Everything user-visible is already translated in `data/locales/en.ts` / `ar.ts`. Never return
   user-facing English strings from the API — return codes/enums and let the UI translate them.
5. Every localized entity is stored as two columns (`*_en`, `*_ar`) and mapped into the
   `Localized` type (`{ en, ar }`) by the data layer. Egyptian Arabic (`ar`) is the default locale.

## Stack

| Concern | Choice |
| --- | --- |
| DB / Auth / Storage / Realtime | Supabase (Postgres 15+) |
| Auth method | Phone OTP (`signInWithOtp`), Egyptian numbers only (`+20`) |
| Hosting (web) | Vercel |
| Mobile wrapper | Capacitor (same React bundle) — later |
| Scheduled work | `pg_cron` in Supabase (fallback: Vercel Cron) |
| Server logic | Postgres functions (RPC) first, Edge Functions only for third-party calls |
| Payments | Cash on delivery (default), Paymob (cards), Instapay handle |
| Maps | See [Maps decision](#maps-decision) — the prototype map is stylised, not a real map |
| Push | FCM + APNs (via Supabase Edge Function or OneSignal) |

## Environment variables

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server/edge only, never in the client bundle
SMS_PROVIDER_API_KEY             # SMSMisr / Vodafone aggregator for OTP + order SMS
PAYMOB_API_KEY
PAYMOB_HMAC_SECRET
PAYMOB_INTEGRATION_ID
FCM_SERVICE_ACCOUNT_JSON
SENTRY_DSN
MAPS_API_KEY                     # only if Google Maps / Places is adopted
ID_OCR_API_KEY                   # national-ID reading, if automated
```

---

# SQL tree

Apply as ordered migrations in `supabase/migrations/`. `uuid` PKs everywhere except catalog tables,
which keep the human slugs the frontend already ships with (`terea-amber`, `iluma-one`, …).

```
public
├── enums
│   ├── locale_code            ('en','ar')
│   ├── accent_name            ('lime','cyan','magenta','amber')
│   ├── category_id            ('vapes','iqos_devices','iqos_cases','heets','cigars','cigarettes')
│   ├── product_badge          ('new','hot','low_stock')
│   ├── address_kind           ('home','work','other')
│   ├── payment_kind           ('cash','card','instapay')
│   ├── order_status           ('confirmed','packing','on_the_way','delivered','cancelled')
│   ├── id_status              ('pending','approved','rejected')
│   └── courier_status         ('offline','idle','assigned','delivering')
│
├── identity
│   ├── profiles               (1-1 auth.users)
│   ├── id_verifications       (national-ID submissions, 18+ gate)
│   ├── notification_prefs
│   └── device_tokens
│
├── catalog
│   ├── categories
│   ├── products
│   ├── product_specs
│   ├── product_reviews
│   ├── favorites
│   └── restock_watches
│
├── delivery
│   ├── zones                  (polygon + delivery fee + operating hours)
│   ├── addresses
│   └── couriers               (1-1 auth.users, role = 'courier')
│       └── courier_locations  (append-only GPS pings)
│
├── commerce
│   ├── payment_methods
│   ├── promotions
│   ├── promotion_redemptions
│   ├── orders
│   ├── order_items            (price snapshots)
│   ├── order_events           (status audit trail)
│   └── loyalty_ledger         (points in / points out)
│
├── ops
│   ├── app_settings           (hero banner, hours, fees, feature flags)
│   ├── support_tickets
│   ├── support_messages
│   └── audit_log
│
└── views / functions
    ├── v_user_stats           (delivered_orders_count, points, accent tiers)
    ├── v_trending_products    (materialized, refreshed by cron)
    ├── fn_place_order()
    ├── fn_set_default_payment_method()
    ├── fn_delete_payment_method()
    ├── fn_set_default_address()
    ├── fn_advance_order_status()   (courier app)
    ├── fn_assign_courier()
    └── trg_award_points_on_delivery
```

## Core DDL

```sql
-- identity ------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  phone         text not null unique,              -- '+20 10 1234 5678'
  name          text not null,
  initials      text not null,
  points        integer not null default 0,
  locale        locale_code not null default 'ar', -- Egyptian Arabic is the default
  accent        accent_name not null default 'lime',
  age_verified  boolean not null default false,
  id_last_four  text,
  is_blocked    boolean not null default false,
  created_at    timestamptz not null default now()
);

create table id_verifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles on delete cascade,
  front_path      text not null,      -- storage: id-docs/{user_id}/front.jpg
  back_path       text not null,
  national_id_hash text not null,     -- sha256, never store the raw 14 digits
  last_four       text not null,
  status          id_status not null default 'pending',
  reject_reason   text,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create table notification_prefs (
  user_id  uuid primary key references profiles on delete cascade,
  orders   boolean not null default true,
  offers   boolean not null default true,
  restock  boolean not null default false
);

create table device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles on delete cascade,
  token      text not null unique,
  platform   text not null check (platform in ('ios','android','web')),
  created_at timestamptz not null default now()
);

-- catalog -------------------------------------------------------------------
create table categories (
  id         category_id primary key,
  label_en   text not null,
  label_ar   text not null,
  icon       text not null,
  sort_order integer not null default 0
);

create table products (
  id                 text primary key,          -- slug, matches data/products.ts
  name_en text not null, name_ar text not null,
  tagline_en text not null, tagline_ar text not null,
  description_en text not null, description_ar text not null,
  price              numeric(10,2) not null check (price >= 0),
  compare_at_price   numeric(10,2),
  image_url          text not null,
  category_id        category_id not null references categories,
  rating             numeric(2,1) not null default 0,
  review_count       integer not null default 0,
  stock              integer not null default 0 check (stock >= 0),
  badge              product_badge,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);
create index on products (category_id) where is_active;

create table product_specs (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null references products on delete cascade,
  label_en text not null, label_ar text not null,
  value_en text not null, value_ar text not null,
  sort_order integer not null default 0
);

create table favorites (
  user_id    uuid not null references profiles on delete cascade,
  product_id text not null references products on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table restock_watches (
  user_id    uuid not null references profiles on delete cascade,
  product_id text not null references products on delete cascade,
  notified_at timestamptz,
  primary key (user_id, product_id)
);

-- delivery ------------------------------------------------------------------
create table zones (
  id            uuid primary key default gen_random_uuid(),
  name_en text not null, name_ar text not null,
  polygon       jsonb not null,              -- or geography(Polygon) with PostGIS
  delivery_fee  numeric(10,2) not null default 25,
  opens_at      time not null default '10:00',
  closes_at     time not null default '02:00',
  is_active     boolean not null default true
);

create table addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles on delete cascade,
  label_en text not null, label_ar text not null,
  line_en  text not null, line_ar  text not null,
  lat numeric(9,6), lng numeric(9,6),
  -- normalized 0-1 coords the stylised map canvas renders with
  x numeric(4,3) not null, y numeric(4,3) not null,
  eta_minutes integer not null default 25,
  kind        address_kind not null default 'other',
  building text, floor text, apartment text, landmark text,
  note        text,
  zone_id     uuid references zones,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index addresses_one_default on addresses (user_id) where is_default;

create table couriers (
  id         uuid primary key references auth.users on delete cascade,
  name       text not null,
  initials   text not null,
  phone      text not null,
  vehicle    text not null,             -- 'Scooter, NX-42'
  status     courier_status not null default 'offline',
  zone_id    uuid references zones,
  rating     numeric(2,1) not null default 5.0,
  created_at timestamptz not null default now()
);

create table courier_locations (
  id          bigserial primary key,
  courier_id  uuid not null references couriers on delete cascade,
  lat numeric(9,6) not null, lng numeric(9,6) not null,
  x numeric(4,3), y numeric(4,3),
  recorded_at timestamptz not null default now()
);
create index on courier_locations (courier_id, recorded_at desc);

-- commerce ------------------------------------------------------------------
create table payment_methods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles on delete cascade,
  kind        payment_kind not null,
  brand       text,          -- 'Visa'
  last4       text,
  expiry      text,          -- 'MM/YY'
  phone       text,          -- instapay handle
  provider_token text,       -- Paymob saved-card token, never a PAN
  removable   boolean not null default true,   -- cash row is false
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index payment_methods_one_default on payment_methods (user_id) where is_default;
-- Every profile gets a cash row (removable = false, is_default = true) on signup.

create table orders (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,        -- '#EG2481', shown in the UI
  user_id           uuid not null references profiles,
  courier_id        uuid references couriers,
  address_snapshot  jsonb not null,              -- frozen DeliveryAddress
  payment_method_id uuid references payment_methods on delete set null,
  payment_kind      payment_kind not null,       -- snapshot, survives deletion
  subtotal          numeric(10,2) not null,
  delivery_fee      numeric(10,2) not null,
  discount          numeric(10,2) not null default 0,
  total             numeric(10,2) not null,
  status            order_status not null default 'confirmed',
  eta_minutes       integer not null,
  points_earned     integer not null default 0,
  rating            smallint check (rating between 1 and 5),
  cancel_reason     text,
  placed_at         timestamptz not null default now(),
  delivered_at      timestamptz
);
create index on orders (user_id, placed_at desc);
create index on orders (courier_id) where status <> 'delivered';

create table order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders on delete cascade,
  product_id  text not null references products,
  name_en text not null, name_ar text not null,   -- snapshot for the receipt
  unit_price  numeric(10,2) not null,
  quantity    integer not null check (quantity > 0)
);

create table order_events (
  id         bigserial primary key,
  order_id   uuid not null references orders on delete cascade,
  status     order_status not null,
  actor      text not null,        -- 'system' | 'courier:<uuid>' | 'admin:<uuid>'
  note       text,
  created_at timestamptz not null default now()
);

create table loyalty_ledger (
  id         bigserial primary key,
  user_id    uuid not null references profiles on delete cascade,
  delta      integer not null,
  reason     text not null,        -- 'order_delivered' | 'redeemed' | 'manual'
  order_id   uuid references orders,
  created_at timestamptz not null default now()
);

create table promotions (
  id             uuid primary key default gen_random_uuid(),
  code           text unique,
  kind           text not null check (kind in ('percent','fixed','free_delivery')),
  value          numeric(10,2) not null default 0,
  category_id    category_id,
  min_subtotal   numeric(10,2) not null default 0,
  starts_at timestamptz not null, ends_at timestamptz not null,
  max_uses integer, per_user_limit integer not null default 1,
  is_active      boolean not null default true
);

create table promotion_redemptions (
  id           uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions on delete cascade,
  user_id      uuid not null references profiles on delete cascade,
  order_id     uuid not null references orders on delete cascade,
  created_at   timestamptz not null default now()
);

-- ops -----------------------------------------------------------------------
create table app_settings (
  key        text primary key,   -- 'home_hero', 'delivery_fee', 'hours', 'flags'
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table support_tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles on delete cascade,
  order_id   uuid references orders,
  subject    text not null,
  status     text not null default 'open',
  created_at timestamptz not null default now()
);

create table support_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references support_tickets on delete cascade,
  author     text not null,   -- 'user' | 'agent'
  body       text not null,
  created_at timestamptz not null default now()
);

create table audit_log (
  id         bigserial primary key,
  actor      uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  payload    jsonb,
  created_at timestamptz not null default now()
);
```

## Views and functions

```sql
-- Drives the accent unlock tiers (green 0, blue 10, pink 50, gold 100).
-- The thresholds live in the frontend; the backend only exposes the count.
create view v_user_stats as
select p.id as user_id,
       p.points,
       count(o.id) filter (where o.status = 'delivered') as delivered_orders_count,
       count(o.id) as orders_count
from profiles p left join orders o on o.user_id = p.id
group by p.id;

create materialized view v_trending_products as
select p.id, count(oi.id) as sold_30d
from products p
left join order_items oi on oi.product_id = p.id
left join orders o on o.id = oi.order_id and o.placed_at > now() - interval '30 days'
where p.is_active
group by p.id order by sold_30d desc;
```

`fn_place_order(p_items jsonb, p_address_id uuid, p_payment_method_id uuid, p_promo_code text)`
— **single transaction**, `security definer`:

1. assert `profiles.age_verified` and `not is_blocked`;
2. assert the address belongs to the caller and its zone is open right now;
3. lock the product rows (`select … for update`), assert stock, decrement;
4. recompute `subtotal` / `delivery_fee` / `discount` **server-side** (never trust client totals);
5. snapshot the address, payment kind, and item prices;
6. generate `code` (`'#EG' || lpad(nextval('order_code_seq')::text, 4, '0')`);
7. insert `orders`, `order_items`, `order_events('confirmed','system')`;
8. return the row shaped like the `Order` type.

`fn_advance_order_status(p_order_id, p_status)` — courier/admin only, enforces the legal transition
graph `confirmed → packing → on_the_way → delivered` (plus `cancelled` before `on_the_way`), writes
`order_events`, stamps `delivered_at`, and fires the points trigger.

`trg_award_points_on_delivery` — on `orders.status → 'delivered'`: insert `loyalty_ledger`
(`floor(total / 10)` points), bump `profiles.points`, set `orders.points_earned`.

`fn_set_default_payment_method` / `fn_delete_payment_method` — flip `is_default` atomically; refuse
to delete a row with `removable = false`; if the deleted row was the default, promote the cash row.
The UI already assumes exactly one default always exists.

## RLS (enable on every table)

| Table | Policy |
| --- | --- |
| `profiles` | select/update `id = auth.uid()` |
| `id_verifications` | insert/select own; update only service role |
| `notification_prefs`, `device_tokens`, `favorites`, `restock_watches` | all own rows |
| `addresses`, `payment_methods` | all own rows; delete blocked when `removable = false` |
| `categories`, `products`, `product_specs`, `zones`, `app_settings` | public select where `is_active` |
| `orders`, `order_items`, `order_events` | select own; **or** `courier_id = auth.uid()`; insert only via `fn_place_order` |
| `couriers`, `courier_locations` | courier writes own row; customer may select the courier assigned to their active order (expose via a narrow view, not the table) |
| `loyalty_ledger` | select own |
| `support_tickets`, `support_messages` | own tickets |
| `audit_log` | service role only |

## Storage buckets

| Bucket | Public | Contents | Retention |
| --- | --- | --- | --- |
| `product-images` | yes | catalog imagery | — |
| `id-docs` | **no** | national-ID front/back | delete 90 days after approval (cron) |
| `delivery-proofs` | no | courier hand-off photos | 180 days |
| `avatars` | yes | optional profile pictures | — |

## Auth flow

1. `signInWithOtp({ phone: '+20…' })`. Egyptian numbers only — validate `^\+201[0125]\d{8}$`
   server-side too (`utils/format.ts` has the client rule).
2. On first successful verify, a trigger on `auth.users` creates: `profiles`, `notification_prefs`,
   and the non-removable **cash** `payment_methods` row marked `is_default`.
3. Age gate: user confirms 18+, uploads ID → `id_verifications` row (`pending`) → OCR/manual review
   → on approve set `profiles.age_verified = true` and `id_last_four`. Orders are rejected until then.
4. Custom SMS sender: if Supabase's default SMS pricing is not viable for Egypt, point the Auth SMS
   hook at an Edge Function that calls a local aggregator (SMSMisr / Vodafone Bulk).

## Realtime

| Channel | Table / filter | Consumer |
| --- | --- | --- |
| order status | `orders` where `user_id = auth.uid()` | customer tracking screen |
| order timeline | `order_events` where `order_id = …` | customer tracking screen |
| courier pings | `courier_locations` where `courier_id = <assigned>` | customer map marker |
| dispatch queue | `orders` where `status = 'confirmed'` | courier app + admin |

Replace the fake `STATUS_TIMELINE` timers in `contexts/OrderContext.tsx` with these subscriptions.

## Edge Functions

| Function | Trigger | Job |
| --- | --- | --- |
| `sms-send` | Auth SMS hook / RPC | OTP + order SMS via local aggregator |
| `id-verify` | new `id_verifications` row | OCR, age math, auto-approve or queue |
| `paymob-webhook` | Paymob HTTP callback | verify HMAC, mark payment captured/failed |
| `push-send` | DB webhook on `order_events` | FCM/APNs fan-out honouring `notification_prefs` |
| `assign-courier` | DB webhook on new order | pick nearest idle courier in the zone |

## Cron jobs (`pg_cron`)

| Schedule | Job |
| --- | --- |
| `*/5 * * * *` | auto-assign unclaimed `confirmed` orders; alert dispatch after 10 min |
| `*/15 * * * *` | flag orders stuck in one status past SLA |
| `0 * * * *` | refresh `v_trending_products` |
| `0 3 * * *` | purge `courier_locations` older than 30 days; purge approved `id-docs` past 90 days |
| `0 4 * * *` | activate/expire `promotions`, rotate the home hero in `app_settings` |
| `0 5 * * *` | low-stock report; notify `restock_watches` when stock goes 0 → >0 |
| `0 6 * * 1` | weekly courier payout + ops summary |

## Maps decision

`components/order/DeliveryMap.tsx` is a **stylised SVG board**, not a real map: markers are
normalized `0-1` `x`/`y` coordinates. Keep it — it costs nothing and matches the art direction.

- Store real `lat`/`lng` on `addresses` and `courier_locations` **and** the projected `x`/`y` so the
  existing component keeps working (projection helper belongs in `lib/`, not in the components).
- Only adopt a paid maps SDK if you need address autocomplete or turn-by-turn for couriers. In that
  case prefer **MapLibre GL + Protomaps/OpenFreeMap tiles** (self-hosted, effectively free) and use
  Google **Places Autocomplete** alone for address search, which is the cheapest useful slice.

## Frontend contract

Swap the mock internals; keep the exports identical.

| File | Today | Replace with |
| --- | --- | --- |
| `contexts/AuthContext.tsx` | fake OTP `1234` | Supabase phone OTP + `profiles` + ID upload |
| `hooks/useCatalog.ts` | `data/products.ts` + fake latency | `products` + `product_specs` + `v_trending_products` |
| `contexts/CartContext.tsx` | in-memory lines | keep local; persist to `localStorage`, validate stock on checkout |
| `contexts/AddressContext.tsx` | `data/addresses.ts` | `addresses` CRUD (+ `is_default`) |
| `contexts/PaymentContext.tsx` | `data/payments.ts` | `payment_methods` + `fn_set_default_payment_method` / `fn_delete_payment_method` |
| `contexts/OrderContext.tsx` | seeded orders + timers | `fn_place_order`, `orders` query, Realtime status, `deliveredCount` from `v_user_stats` |
| `contexts/FavoritesContext.tsx` | in-memory set | `favorites` |
| `contexts/LocaleContext.tsx` | props only | persist `locale` + `accent` on `profiles`, hydrate on boot |

Non-negotiable shapes the UI depends on:

- `Order.paymentMethodId` must resolve to something in `usePayments().methods`, otherwise the
  receipt sheet falls back to the first method.
- `useOrders().deliveredCount` gates the accent unlocks (10 / 50 / 100). It must count **delivered**
  orders only.
- `usePayments().defaultId` must always point at an existing method — the checkout screen preselects
  it and the settings panel opens on it.
- `DeliveryAddress.x`/`y` must stay within `0-1`.
- `Localized` fields must always have both `en` and `ar` populated (fall back to `en`).

## Courier app

Build it as a **separate app on the same Supabase project** — do not bolt it onto this bundle.
Rationale: couriers need a different auth role, a permanently-on GPS/foreground service, a much
smaller surface (queue → pick up → deliver → proof of delivery), and the customer bundle must not
ship dispatch logic. One database, one dispatch truth, two clients.

Backend additions needed for it: `couriers`, `courier_locations`, `fn_advance_order_status`,
`assign-courier`, the dispatch Realtime channel, `delivery-proofs` storage, and a `courier` role
claim in the JWT so RLS can distinguish courier reads from customer reads.

## Acceptance checklist

- [ ] RLS enabled on every table; anon key can read nothing private (verify with a script).
- [ ] No client can write `orders`, `order_items`, `points`, `stock`, or `age_verified` directly.
- [ ] `fn_place_order` is atomic: concurrent orders cannot oversell stock.
- [ ] Exactly one default payment method and one default address per user, always.
- [ ] Receipts render for every order, including ones whose payment method was later deleted.
- [ ] Order status reaches the client via Realtime in under 2s, no polling.
- [ ] Underage / unverified accounts cannot place an order (tested at the RPC, not the UI).
- [ ] Raw national-ID numbers are never stored; ID images are purged on schedule.
- [ ] `locale` and `accent` survive sign-out / sign-in.
- [ ] Every RPC has a pgTAP or Vitest integration test.

---

# Cost model per milestone

Prices are **USD/month estimates** and must be re-verified before you commit — cloud pricing moves.
Assumptions: 4 orders/user/month, ~EGP 400 average order, 1.2 OTP SMS/user/month, 40% of orders paid
by card once card payment ships, images served from Supabase Storage + CDN.

### One-off / annual (independent of scale)

| Item | Cost |
| --- | --- |
| Domain (`.com` + `.app`) | ~$25/yr |
| Apple Developer Program | $99/yr |
| Google Play registration | $25 once |
| Paymob merchant onboarding | ~EGP 1,500 once (varies) |
| Company registration, tax card, tobacco retail licence | **legal, get a local quote — budget EGP 30–80k** |
| Brand / legal docs (terms, privacy, age policy) | $200–800 once |

### Recurring by milestone (MAU)

| Line item | 1 | 10 | 100 | 1,000 | 10,000 | 100,000 |
| --- | --- | --- | --- | --- | --- | --- |
| Supabase | Free $0 | Free $0 | Pro $25 | Pro $25 + ~$10 usage | Pro $25 + compute/storage/egress ~$225 | Team $599 + compute XL + replica ~$1,400 |
| Vercel | Hobby $0 | Hobby $0 | **Pro $20** (commercial use) | Pro $20 + ~$5 | Pro $20 + bandwidth ~$50 | Pro/Enterprise ~$350–800 |
| SMS OTP (local aggregator ≈ $0.009/SMS) | ~$0 | ~$0.10 | ~$1 | ~$11 | ~$110 | ~$1,080 |
| Transactional SMS "courier on the way" (optional, 1/order) | $0 | $0.35 | $3.60 | $36 | $360 | $3,600 |
| Push (FCM/APNs) | $0 | $0 | $0 | $0 | $0 (or OneSignal $9) | $0 (or OneSignal ~$99) |
| Email (Resend) | $0 | $0 | $0 | $0 | $20 | $90 |
| Maps — stylised SVG (recommended) | $0 | $0 | $0 | $0 | $0 | $0 |
| Maps — if Google Places autocomplete is added | $0 | $0 | $0 (free tier) | ~$15 | ~$150 | ~$1,400 |
| Maps — if full Google Maps SDK + Routes for couriers | $0 | $0 | ~$10 | ~$90 | ~$850 | ~$8,000 |
| Error monitoring (Sentry) | $0 | $0 | $0 | $0 | $26 | $80–300 |
| Product analytics (PostHog) | $0 | $0 | $0 | $0 | ~$50 | ~$450 |
| Uptime / logs (BetterStack) | $0 | $0 | $0 | $0 | $20 | $80 |
| Cron (`pg_cron` inside Supabase) | $0 | $0 | $0 | $0 | $0 | $0 |
| Image CDN / optimisation (Cloudflare) | $0 | $0 | $0 | $5 | $20 | $100 |
| Redis cache for hot catalog (Upstash) | $0 | $0 | $0 | $0 | $10 | $60 |
| Admin/ops dashboard (Retool or self-built) | $0 | $0 | $0 | $0 | $50 | $250 |
| Support desk / WhatsApp Business API | $0 | $0 | $0 | ~$30 | ~$120 | ~$600 |
| **Tech subtotal (recommended stack)** | **~$0** | **~$1** | **~$30** | **~$140** | **~$1,090** | **~$8,300** |
| + Apple/Google/domain amortised | $11 | $11 | $11 | $11 | $11 | $11 |

### Revenue-linked costs (scale with GMV, not users)

| Line item | Rate | 1,000 MAU (4k orders) | 10,000 MAU (40k) | 100,000 MAU (400k) |
| --- | --- | --- | --- | --- |
| Card processing (Paymob ≈ 2.75% + EGP 3, 40% of orders) | per txn | ~$490 | ~$4,900 | ~$49,000 |
| Cash handling / reconciliation loss (≈0.5% of cash GMV) | — | ~$50 | ~$500 | ~$5,000 |
| Courier pay (EGP 25–35/delivery) | per order | ~$2,300 | ~$23,000 | ~$230,000 |
| Packaging | ~EGP 3/order | ~$250 | ~$2,500 | ~$25,000 |
| Inventory / COGS | ~70% of GMV | dominant | dominant | dominant |

### Scaling notes

- **Vercel Hobby forbids commercial use** — move to Pro the moment you take a real order.
- Supabase Free pauses idle projects and has no PITR backups. Go **Pro before your first paying
  user**; $25 buys daily backups, no pausing, and 8 GB DB.
- Biggest avoidable bill is **maps**; the stylised board keeps it at zero. Second biggest is **SMS** —
  cut OTP resends, use 60s cooldowns, and prefer push over SMS for order updates once the app is installed.
- At ~10k MAU add: a read replica or PgBouncer tuning, Redis in front of the catalog, image resizing
  at upload, and `courier_locations` partitioning (it is the fastest-growing table).
- At ~100k MAU the DB, not the frontend, is the constraint: partition `orders` by month, move
  `courier_locations` to a time-series store, and negotiate SMS + payment rates directly.
