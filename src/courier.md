# DOKHAN COURIER — brief for a new Magic Patterns project

This is the rider-facing half of Dokhan, the 18+ tobacco / vape / IQOS delivery app for Cairo.
Build it as a **separate project on the same Supabase database** (`iwwjbeiivtfxyujxmzma`). Do not
extend the customer app: couriers sign in with a different role, need a permanently-on GPS service,
and the customer bundle must never ship dispatch logic. One database, one dispatch truth, two
clients.

The customer app and its whole schema already exist. Everything below is live in the database
today — this project only has to build the client.

---

## 1 · Who is using it

A rider on a scooter, one hand, outdoors, in sunlight, mid-shift. Arabic first (Egyptian Arabic is
the default locale), RTL layout, big targets, no dense tables, no modals that need two taps to
dismiss. The app is a work tool: it should answer "what do I do next" in under a second.

Design language matches the customer app: near-black `ink` surfaces, one neon accent, chunky
rounded controls, `font-display` for numbers and headings. React + TypeScript + Tailwind, the same
framer-motion motion budget (150–250ms, `cubic-bezier(0.23, 1, 0.32, 1)`, no entrance animation on
content that is already there).

## 2 · Screens

| Screen | Purpose | Notes |
| --- | --- | --- |
| **Sign in** | Phone OTP, same `+20` rule as the customer app | a courier is an `auth.users` row linked to a `couriers` row |
| **Shift toggle** | `offline` ⇄ `idle` | going online starts the GPS ping loop; going offline stops it |
| **Queue** | Unclaimed `confirmed` orders in the rider's zone | live list, each card: code, zone, item count, total, cash-to-collect, distance |
| **Order detail** | Claim → Picked up → Delivered | one primary action at a time, never two |
| **Navigate** | Address, landmark, building / floor / apartment, member note, call button | the note is the most-read field on the screen; give it real weight |
| **Proof of delivery** | Photo + cash-collected confirmation | uploads to the `delivery-proofs` bucket |
| **Earnings** | Deliveries today / week, cash held, rating | read from `orders` where `courier_id = me` |
| **Profile** | Name, vehicle, phone, zone, sign out | `couriers` row |

Flow: `queue → claim → navigate → picked up → delivered (+ proof) → queue`.

## 3 · Data contract (already live)

```
couriers            id, user_id, name, initials, phone, vehicle, status, zone_id, rating
                    status ∈ ('offline','idle','assigned','delivering')
courier_locations   courier_id, lat, lng, x, y, recorded_at        -- append-only
orders              id, code, status, address_snapshot(jsonb), courier_id, courier_snapshot,
                    payment_kind, subtotal, delivery_fee, discount, total, eta_minutes, placed_at
order_items         order_id, product_id, quantity, unit_price, name_en, name_ar
order_events        order_id, status, actor, created_at            -- audit trail
zones               id, name_en, name_ar, bounding box, delivery_fee, opens_at, closes_at
```

`address_snapshot` is a frozen customer address, camelCase:
`{ id, label:{en,ar}, line:{en,ar}, x, y, etaMinutes, kind, building, floor, apartment, landmark, note }`.
`x`/`y` are normalized `0-1` coordinates for the stylised map board; real `lat`/`lng` live on
`addresses` and `courier_locations`. Projection (keep it identical in both apps):

```
lat = 30.09 - y * 0.12      lng = 31.19 + x * 0.14
```

Localized columns always ship as `*_en` / `*_ar` pairs. **Never render an English string returned by
the API** — the API returns codes and enums, the client translates them.

## 4 · What the client is allowed to do

Reads (RLS already enforces all of this):

- `orders` where `courier_id = my courier id`, **or** unclaimed `confirmed` orders (the dispatch
  queue policy tests `fn_is_courier()`).
- `order_items` / `order_events` for those orders.
- own `couriers` row; own `courier_locations`.

Writes:

| Action | How |
| --- | --- |
| Advance a status | `rpc('fn_advance_order_status', { p_order_id, p_status })` — enforces `confirmed → packing → on_the_way → delivered`, plus `cancelled` before `on_the_way`, writes `order_events`, stamps `delivered_at`, fires the loyalty trigger |
| Claim an order | `rpc('fn_assign_courier', { p_order_id, p_courier_id })` |
| GPS ping | `insert into courier_locations` (own `courier_id` only) — every 10–15s while `delivering`, else every 60s |
| Shift status / zone | `update couriers set status, zone_id` on own row (column-grant limited) |

Direct writes to `orders`, `order_items`, points or stock are impossible from any client key.

## 5 · Realtime

| Channel | Table / filter | Screen |
| --- | --- | --- |
| dispatch queue | `orders` where `status = 'confirmed'` | queue |
| my orders | `orders` where `courier_id = <me>` | order detail |
| timeline | `order_events` where `order_id = …` | order detail |

`orders`, `order_events` and `courier_locations` are already in the `supabase_realtime`
publication. No polling anywhere.

## 6 · Setup steps for this project

1. `npm` dependency: `@supabase/supabase-js`.
2. Client config: `https://iwwjbeiivtfxyujxmzma.supabase.co` + the **anon** key. Never the
   service-role key.
3. A courier account is created by ops, not self-serve:
   ```sql
   -- after the rider signs in once with their phone
   insert into public.couriers (user_id, name, initials, phone, vehicle, status, zone_id)
   values ('<auth.users id>', 'Dina', 'DN', '+201001234567', 'Scooter, NX-42', 'offline',
           (select id from public.zones where name_en = 'Zamalek'));
   ```
   Two demo riders (Dina, Karim) are already seeded with no `user_id` — attach one to a real account
   for testing rather than creating a third.
4. Proof-of-delivery uploads go to `delivery-proofs/<order_id>/<timestamp>.jpg` (private bucket,
   courier-only policies already exist).

## 7 · Still to decide

- **Turn-by-turn navigation.** The stylised board is enough for dispatch; if real routing is needed,
  prefer MapLibre GL + Protomaps/OpenFreeMap tiles (self-hosted, effectively free) and hand off to
  the device's native maps app for the last leg.
- **Foreground GPS service.** Needs the Capacitor wrapper; in the browser build, ping only while the
  app is visible.
- **Cash reconciliation.** `orders.payment_kind = 'cash'` gives cash held per rider; the payout
  summary job (`0 6 * * 1`) exists as a cron slot but no report is built yet.
