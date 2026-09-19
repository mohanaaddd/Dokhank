export type Locale = 'en' | 'ar';

/** Mirrors a Supabase row with `*_en` / `*_ar` localized columns. */
export type Localized = Record<Locale, string>;

/** Which of the three apps in this bundle a signed-in account sees. */
export type AppRole = 'customer' | 'courier' | 'owner';

export type CategoryId =
'vapes' |
'iqos_devices' |
'iqos_cases' |
'heets' |
'cigars' |
'cigarettes';

export interface Category {
  id: CategoryId;
  label: Localized;
  icon: string;
}

export type ProductBadge = 'new' | 'hot' | 'low_stock';

export interface Product {
  id: string;
  name: Localized;
  tagline: Localized;
  description: Localized;
  price: number;
  compareAtPrice?: number;
  image: string;
  category: CategoryId;
  rating: number;
  reviewCount: number;
  stock: number;
  badge?: ProductBadge;
  /** Owner console only — inactive products never reach the shop. */
  isActive?: boolean;
  specs: Array<{label: Localized;value: Localized;}>;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

/**
 * A line on a placed order. `order_items` snapshots the name and price at the
 * time of purchase, so an order renders correctly even after the product is
 * renamed, repriced or deactivated.
 */
export interface OrderLine extends CartLine {
  name?: Localized;
  image?: string;
  unitPrice?: number;
}

export type AddressLabel = 'home' | 'work' | 'other';

export interface DeliveryAddress {
  id: string;
  label: Localized;
  line: Localized;
  /** Normalized 0-1 coordinates against the stylized map canvas. */
  x: number;
  y: number;
  etaMinutes: number;
  note?: string;
  /** Talabat-style detail fields captured after the pin is dropped. */
  kind?: AddressLabel;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  phone: string;
}

export type PaymentKind = 'cash' | 'card' | 'instapay';

export interface PaymentMethod {
  id: string;
  kind: PaymentKind;
  brand?: string;
  last4?: string;
  expiry?: string;
  phone?: string;
  /** Cash on delivery is a system method and can never be deleted. */
  removable: boolean;
}

export type OrderStatus = 'confirmed' | 'packing' | 'on_the_way' | 'delivered' | 'cancelled';

/** The happy path. `cancelled` is an exit, not a step, so it is not in here. */
export const ORDER_FLOW: Array<Exclude<OrderStatus, 'cancelled'>> = [
'confirmed',
'packing',
'on_the_way',
'delivered'];


export interface Order {
  id: string;
  /** Human order code from the backend, e.g. `#EG2481`. */
  code?: string;
  lines: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  address: DeliveryAddress;
  status: OrderStatus;
  placedAt: number;
  etaMinutes: number;
  courier: {name: string;vehicle: string;initials: string;};
  paymentMethodId: string;
  paymentKind?: PaymentKind;
  /** Loyalty points credited when the order was delivered. */
  pointsEarned?: number;
  cancelReason?: string;
}

/** An order as ops sees it: who ordered, who is carrying it, why it died. */
export interface OpsOrder extends Order {
  customerName: string;
  customerPhone: string;
  courierId: string | null;
}

export interface CourierRecord {
  id: string;
  name: string;
  initials: string;
  phone: string;
  vehicle: string;
  status: 'offline' | 'idle' | 'assigned' | 'delivering';
  zoneId: string | null;
  rating: number;
  linked: boolean;
}

export interface RevenueDay {
  day: string;
  orders: number;
  delivered: number;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  name: Localized;
  units: number;
  revenue: number;
}

export interface StoreSnapshot {
  revenueToday: number;
  revenueYesterday: number;
  revenue7d: number;
  revenuePrev7d: number;
  revenue30d: number;
  ordersToday: number;
  orders30d: number;
}

export interface UserProfile {
  id: string;
  name: string;
  /** Stored in full international form, e.g. `+20 10 1234 5678`. */
  phone?: string;
  username: string;
  firstName: string;
  lastName: string;
  initials: string;
  points: number;
  ageVerified: boolean;
  /** Last four digits of the national ID used for age verification. */
  idLastFour?: string;
  /** Server-owned. Decides which of the three shells mounts at sign-in. */
  role: AppRole;
}

/** Finite navigation states — no router, the machine owns the screen graph. */
export type Screen =
// shared
{name: 'welcome';} |
{name: 'auth';}
// customer
| {name: 'home';} |
{name: 'search';} |
{name: 'product';productId: string;} |
{name: 'cart';} |
{name: 'location';}
/** `intent: 'new'` skips the saved list and opens the form directly. */ |
{name: 'address';intent?: 'new';} |
{name: 'checkout';} |
{name: 'tracking';orderId: string;} |
{name: 'delivered';orderId: string;} |
{name: 'orders';} |
{name: 'profile';}
// courier
| {name: 'courier_queue';}
/** Param-less: the courier can only ever carry one order at a time. */ |
{name: 'courier_active';} |
{name: 'courier_profile';}
// owner
| {name: 'owner_orders';} |
{name: 'owner_order';orderId: string;} |
{name: 'owner_catalog';} |
{name: 'owner_product';productId: string | null;} |
{name: 'owner_insights';} |
{name: 'owner_profile';} |
{name: 'owner_couriers';};

export type ScreenName = Screen['name'];

export type TabName = ScreenName;

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';