export type Locale = 'en' | 'ar';

/** Mirrors a Supabase row with `*_en` / `*_ar` localized columns. */
export type Localized = Record<Locale, string>;

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
  specs: Array<{label: Localized;value: Localized;}>;
}

export interface CartLine {
  productId: string;
  quantity: number;
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
}

export type OrderStatus = 'confirmed' | 'packing' | 'on_the_way' | 'delivered';

export const ORDER_FLOW: OrderStatus[] = ['confirmed', 'packing', 'on_the_way', 'delivered'];

export interface Order {
  id: string;
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  address: DeliveryAddress;
  status: OrderStatus;
  placedAt: number;
  etaMinutes: number;
  courier: {name: string;vehicle: string;initials: string;};
}

export interface UserProfile {
  id: string;
  name: string;
  /** Stored in full international form, e.g. `+20 10 1234 5678`. */
  phone: string;
  initials: string;
  points: number;
  ageVerified: boolean;
  /** Last four digits of the national ID used for age verification. */
  idLastFour?: string;
}

/** Finite navigation states — no router, the machine owns the screen graph. */
export type Screen =
{name: 'welcome';} |
{name: 'auth';} |
{name: 'home';} |
{name: 'search';} |
{name: 'product';productId: string;} |
{name: 'cart';} |
{name: 'location';} |
{name: 'address';} |
{name: 'checkout';} |
{name: 'tracking';orderId: string;} |
{name: 'delivered';orderId: string;} |
{name: 'orders';} |
{name: 'profile';};

export type ScreenName = Screen['name'];

export type TabName = 'home' | 'search' | 'profile';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';