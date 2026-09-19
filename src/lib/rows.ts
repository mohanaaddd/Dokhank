import type {
  AddressLabel,
  AppRole,
  CategoryId,
  OrderStatus,
  PaymentKind,
  ProductBadge } from
'../types';

/**
 * Shapes returned by the Supabase REST layer. `numeric` columns arrive as
 * strings, so every money/coordinate field is typed as `string | number` and
 * coerced in `lib/mappers.ts`.
 */

type Num = string | number;

export interface ProfileRow {
  id: string;
  phone: string;
  name: string;
  initials: string;
  points: number;
  locale: 'en' | 'ar';
  accent: 'lime' | 'cyan' | 'magenta' | 'amber';
  age_verified: boolean;
  id_last_four: string | null;
  is_blocked: boolean;
  role: AppRole | null;
}

export interface CategoryRow {
  id: CategoryId;
  label_en: string;
  label_ar: string;
  icon: string;
  sort_order: number;
}

export interface ProductSpecRow {
  label_en: string;
  label_ar: string;
  value_en: string;
  value_ar: string;
  sort_order: number;
}

export interface ProductRow {
  id: string;
  name_en: string;
  name_ar: string;
  tagline_en: string;
  tagline_ar: string;
  description_en: string;
  description_ar: string;
  price: Num;
  compare_at_price: Num | null;
  image_url: string;
  category_id: CategoryId;
  rating: Num;
  review_count: number;
  stock: number;
  badge: ProductBadge | null;
  is_active?: boolean;
  product_specs?: ProductSpecRow[] | null;
}

export interface AddressRow {
  id: string;
  label_en: string;
  label_ar: string;
  line_en: string;
  line_ar: string;
  x: Num;
  y: Num;
  eta_minutes: number;
  kind: AddressLabel;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  note: string | null;
  is_default: boolean;
}

export interface PaymentMethodRow {
  id: string;
  kind: PaymentKind;
  brand: string | null;
  last4: string | null;
  expiry: string | null;
  phone: string | null;
  removable: boolean;
  is_default: boolean;
}

export interface OrderItemRow {
  product_id: string;
  quantity: number;
  unit_price?: Num;
  /** Snapshotted at purchase time — never re-read from `products`. */
  name_en?: string;
  name_ar?: string;
  products?: {image_url: string;} | null;
}

export interface OrderRow {
  id: string;
  code: string;
  subtotal: Num;
  delivery_fee: Num;
  discount: Num;
  total: Num;
  address_snapshot: Record<string, unknown>;
  courier_snapshot: {name: string;vehicle: string;initials: string;} | null;
  payment_method_id: string | null;
  payment_kind: PaymentKind;
  status: OrderStatus;
  eta_minutes: number;
  points_earned: number;
  placed_at: string;
  delivered_at: string | null;
  cancel_reason?: string | null;
  order_items?: OrderItemRow[] | null;
}

/** The order board query: same row plus who is on either end of it. */
export interface OpsOrderRow extends OrderRow {
  user_id: string;
  courier_id: string | null;
  profiles?: {name: string;phone: string;} | null;
}

export interface CourierRow {
  id: string;
  user_id: string | null;
  name: string;
  initials: string;
  phone: string;
  vehicle: string;
  status: 'offline' | 'idle' | 'assigned' | 'delivering';
  zone_id: string | null;
  rating: Num;
}

export interface ZoneRow {
  id: string;
  name_en: string;
  name_ar: string;
  delivery_fee: Num;
  opens_at: string;
  closes_at: string;
  is_active: boolean;
}

export interface FavoriteRow {
  product_id: string;
}

export interface UserStatsRow {
  points: number;
  delivered_orders_count: number;
  orders_count: number;
}

export interface RevenueDayRow {
  day: string;
  orders_count: number;
  delivered_count: number;
  revenue: Num;
}

export interface TopProductRow {
  product_id: string;
  name_en: string;
  name_ar: string;
  units: number;
  revenue: Num;
}

export interface OwnerTodayRow {
  revenue_today: Num;
  revenue_yesterday: Num;
  revenue_7d: Num;
  revenue_prev_7d: Num;
  revenue_30d: Num;
  orders_today: number;
  orders_30d: number;
}