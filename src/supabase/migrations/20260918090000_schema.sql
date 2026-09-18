-- ============================================================================
-- DOKHAN — 01 · schema (enums, tables, indexes)
-- Apply first. Safe on a fresh project; every object is namespaced to `public`.
-- `gen_random_uuid()` and `sha256()` are core Postgres 13+/11+ — no extensions.
-- ============================================================================

-- ── enums ───────────────────────────────────────────────────────────────────
create type public.locale_code    as enum ('en','ar');
create type public.accent_name    as enum ('lime','cyan','magenta','amber');
create type public.category_id    as enum ('vapes','iqos_devices','iqos_cases','heets','cigars','cigarettes');
create type public.product_badge  as enum ('new','hot','low_stock');
create type public.address_kind   as enum ('home','work','other');
create type public.payment_kind   as enum ('cash','card','instapay');
create type public.order_status   as enum ('confirmed','packing','on_the_way','delivered','cancelled');
create type public.id_status      as enum ('pending','approved','rejected');
create type public.courier_status as enum ('offline','idle','assigned','delivering');

-- ── identity ────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  phone        text not null unique,
  name         text not null,
  initials     text not null,
  points       integer not null default 0 check (points >= 0),
  locale       public.locale_code not null default 'ar',
  accent       public.accent_name not null default 'lime',
  age_verified boolean not null default false,
  id_last_four text,
  is_blocked   boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.id_verifications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles on delete cascade,
  -- Storage paths are filled in once the app captures real images
  -- (bucket `id-docs`, key `{user_id}/front.jpg`).
  front_path       text,
  back_path        text,
  national_id_hash text not null,
  last_four        text not null,
  status           public.id_status not null default 'pending',
  reject_reason    text,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index id_verifications_user_idx on public.id_verifications (user_id, created_at desc);

create table public.notification_prefs (
  user_id uuid primary key references public.profiles on delete cascade,
  orders  boolean not null default true,
  offers  boolean not null default true,
  restock boolean not null default false
);

create table public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  token      text not null unique,
  platform   text not null check (platform in ('ios','android','web')),
  created_at timestamptz not null default now()
);

-- ── catalog ─────────────────────────────────────────────────────────────────
create table public.categories (
  id         public.category_id primary key,
  label_en   text not null,
  label_ar   text not null,
  icon       text not null,
  sort_order integer not null default 0
);

create table public.products (
  id               text primary key,
  name_en          text not null,
  name_ar          text not null,
  tagline_en       text not null,
  tagline_ar       text not null,
  description_en   text not null,
  description_ar   text not null,
  price            numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price >= 0),
  image_url        text not null,
  category_id      public.category_id not null references public.categories,
  rating           numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count     integer not null default 0 check (review_count >= 0),
  stock            integer not null default 0 check (stock >= 0),
  badge            public.product_badge,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index products_category_idx on public.products (category_id) where is_active;

create table public.product_specs (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null references public.products on delete cascade,
  label_en   text not null,
  label_ar   text not null,
  value_en   text not null,
  value_ar   text not null,
  sort_order integer not null default 0
);
create index product_specs_product_idx on public.product_specs (product_id, sort_order);

create table public.product_reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null references public.products on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  body       text,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table public.favorites (
  user_id    uuid not null references public.profiles on delete cascade,
  product_id text not null references public.products on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.restock_watches (
  user_id     uuid not null references public.profiles on delete cascade,
  product_id  text not null references public.products on delete cascade,
  notified_at timestamptz,
  primary key (user_id, product_id)
);

-- ── delivery ────────────────────────────────────────────────────────────────
-- `polygon` keeps the real shape for a future PostGIS upgrade; the bounding box
-- columns are what `fn_zone_for()` actually tests, so no extension is needed.
create table public.zones (
  id           uuid primary key default gen_random_uuid(),
  name_en      text not null,
  name_ar      text not null,
  polygon      jsonb,
  min_lat      numeric(9,6) not null,
  max_lat      numeric(9,6) not null,
  min_lng      numeric(9,6) not null,
  max_lng      numeric(9,6) not null,
  delivery_fee numeric(10,2) not null default 25 check (delivery_fee >= 0),
  opens_at     time not null default '10:00',
  closes_at    time not null default '02:00',
  sort_order   integer not null default 0,
  is_active    boolean not null default true
);

-- Text ids: the app generates `addr_*` client-side when the pin is dropped, and
-- the same id is reused by `fn_place_order`, so the key has to survive as-is.
create table public.addresses (
  id          text primary key,
  user_id     uuid not null references public.profiles on delete cascade,
  label_en    text not null,
  label_ar    text not null,
  line_en     text not null,
  line_ar     text not null,
  lat         numeric(9,6),
  lng         numeric(9,6),
  x           numeric(4,3) not null check (x >= 0 and x <= 1),
  y           numeric(4,3) not null check (y >= 0 and y <= 1),
  eta_minutes integer not null default 25 check (eta_minutes > 0),
  kind        public.address_kind not null default 'other',
  building    text,
  floor       text,
  apartment   text,
  landmark    text,
  note        text,
  zone_id     uuid references public.zones on delete set null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index addresses_one_default on public.addresses (user_id) where is_default;
create index addresses_user_idx on public.addresses (user_id, created_at desc);

-- `user_id` is nullable so dispatch can be seeded before the courier app exists.
create table public.couriers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique references auth.users on delete set null,
  name       text not null,
  initials   text not null,
  phone      text not null,
  vehicle    text not null,
  status     public.courier_status not null default 'offline',
  zone_id    uuid references public.zones on delete set null,
  rating     numeric(2,1) not null default 5.0 check (rating >= 0 and rating <= 5),
  created_at timestamptz not null default now()
);

create table public.courier_locations (
  id          bigserial primary key,
  courier_id  uuid not null references public.couriers on delete cascade,
  lat         numeric(9,6) not null,
  lng         numeric(9,6) not null,
  x           numeric(4,3),
  y           numeric(4,3),
  recorded_at timestamptz not null default now()
);
create index courier_locations_recent_idx on public.courier_locations (courier_id, recorded_at desc);

-- ── commerce ────────────────────────────────────────────────────────────────
create table public.payment_methods (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles on delete cascade,
  kind           public.payment_kind not null,
  brand          text,
  last4          text,
  expiry         text,
  phone          text,
  provider_token text,
  removable      boolean not null default true,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now()
);
create unique index payment_methods_one_default on public.payment_methods (user_id) where is_default;
create index payment_methods_user_idx on public.payment_methods (user_id, created_at);

create table public.promotions (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  percent_off  numeric(5,2) check (percent_off is null or (percent_off > 0 and percent_off <= 100)),
  amount_off   numeric(10,2) check (amount_off is null or amount_off > 0),
  min_subtotal numeric(10,2) not null default 0,
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz,
  max_uses     integer,
  uses         integer not null default 0,
  is_active    boolean not null default true,
  constraint promotions_one_discount check (
    (percent_off is not null and amount_off is null) or
    (percent_off is null and amount_off is not null)
  )
);

create sequence public.order_code_seq start 2482;

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  user_id           uuid not null references public.profiles on delete cascade,
  courier_id        uuid references public.couriers on delete set null,
  address_id        text references public.addresses on delete set null,
  address_snapshot  jsonb not null,
  courier_snapshot  jsonb,
  payment_method_id uuid references public.payment_methods on delete set null,
  payment_kind      public.payment_kind not null,
  promotion_id      uuid references public.promotions on delete set null,
  subtotal          numeric(10,2) not null check (subtotal >= 0),
  delivery_fee      numeric(10,2) not null default 0 check (delivery_fee >= 0),
  discount          numeric(10,2) not null default 0 check (discount >= 0),
  total             numeric(10,2) not null check (total >= 0),
  status            public.order_status not null default 'confirmed',
  eta_minutes       integer not null default 25,
  points_earned     integer not null default 0,
  rating            smallint check (rating between 1 and 5),
  cancel_reason     text,
  placed_at         timestamptz not null default now(),
  delivered_at      timestamptz
);
create index orders_user_idx on public.orders (user_id, placed_at desc);
create index orders_courier_idx on public.orders (courier_id, placed_at desc);
create index orders_open_idx on public.orders (status) where status <> 'delivered' and status <> 'cancelled';

create table public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders on delete cascade,
  product_id text not null references public.products,
  quantity   integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  name_en    text not null,
  name_ar    text not null
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders on delete cascade,
  status     public.order_status not null,
  actor      text not null default 'system',
  note       text,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.promotion_redemptions (
  id           uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions on delete cascade,
  user_id      uuid not null references public.profiles on delete cascade,
  order_id     uuid not null references public.orders on delete cascade,
  created_at   timestamptz not null default now(),
  unique (promotion_id, order_id)
);

create table public.loyalty_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  order_id   uuid references public.orders on delete set null,
  delta      integer not null,
  reason     text not null check (reason in ('order','review','manual','redeem')),
  created_at timestamptz not null default now()
);
create index loyalty_ledger_user_idx on public.loyalty_ledger (user_id, created_at desc);

-- ── ops ─────────────────────────────────────────────────────────────────────
create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  order_id   uuid references public.orders on delete set null,
  topic      text not null,
  status     text not null default 'open' check (status in ('open','pending','closed')),
  created_at timestamptz not null default now()
);

create table public.support_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.support_tickets on delete cascade,
  author     text not null check (author in ('member','agent')),
  body       text not null,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id         bigserial primary key,
  actor      uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  payload    jsonb,
  created_at timestamptz not null default now()
);
