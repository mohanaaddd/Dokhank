import type {
  CourierRecord,
  DeliveryAddress,
  OpsOrder,
  Order,
  OrderLine,
  PaymentMethod,
  Product,
  RevenueDay,
  StoreSnapshot,
  TopProduct,
  UserProfile } from
'../types';
import type {
  AddressRow,
  CourierRow,
  OpsOrderRow,
  OrderRow,
  OwnerTodayRow,
  PaymentMethodRow,
  ProductRow,
  ProfileRow,
  RevenueDayRow,
  TopProductRow } from
'./rows';
import { toLatLng } from './geo';

const num = (value: string | number | null | undefined, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Localized columns always ship in pairs; Arabic falls back to English. */
const pair = (en: string, ar: string | null) => ({ en, ar: ar && ar.length > 0 ? ar : en });

/** Shown when an order has not been picked up by a courier yet. */
export const UNASSIGNED_COURIER = { name: 'Dokhan', vehicle: 'Dispatch', initials: 'DK' };

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DK';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function profileToUser(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? '',
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    initials: row.initials || initialsFrom(row.name),
    points: row.points ?? 0,
    ageVerified: row.age_verified,
    idLastFour: row.id_last_four ?? undefined,
    role: row.role ?? 'customer'
  };
}

export function productFromRow(row: ProductRow): Product {
  const specs = [...(row.product_specs ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: row.id,
    name: pair(row.name_en, row.name_ar),
    tagline: pair(row.tagline_en, row.tagline_ar),
    description: pair(row.description_en, row.description_ar),
    price: num(row.price),
    compareAtPrice: row.compare_at_price === null ? undefined : num(row.compare_at_price),
    image: row.image_url,
    category: row.category_id,
    rating: num(row.rating),
    reviewCount: row.review_count ?? 0,
    stock: row.stock ?? 0,
    badge: row.badge ?? undefined,
    isActive: row.is_active ?? true,
    specs: specs.map((spec) => ({
      label: pair(spec.label_en, spec.label_ar),
      value: pair(spec.value_en, spec.value_ar)
    }))
  };
}

/** The payload `fn_owner_update_product` expects. */
export function productToRow(product: Product) {
  return {
    id: product.id,
    name_en: product.name.en,
    name_ar: product.name.ar,
    tagline_en: product.tagline.en,
    tagline_ar: product.tagline.ar,
    description_en: product.description.en,
    description_ar: product.description.ar,
    price: product.price,
    compare_at_price: product.compareAtPrice ?? null,
    image_url: product.image,
    category_id: product.category,
    stock: product.stock,
    badge: product.badge ?? null,
    is_active: product.isActive ?? true,
    specs: product.specs.map((spec) => ({
      label_en: spec.label.en,
      label_ar: spec.label.ar,
      value_en: spec.value.en,
      value_ar: spec.value.ar
    }))
  };
}

export function addressFromRow(row: AddressRow): DeliveryAddress {
  return {
    id: row.id,
    label: pair(row.label_en, row.label_ar),
    line: pair(row.line_en, row.line_ar),
    x: num(row.x, 0.5),
    y: num(row.y, 0.5),
    etaMinutes: row.eta_minutes ?? 25,
    note: row.note ?? undefined,
    kind: row.kind ?? 'other',
    building: row.building ?? undefined,
    floor: row.floor ?? undefined,
    apartment: row.apartment ?? undefined,
    landmark: row.landmark ?? undefined
    ,phone: row.phone
  };
}

/** The insert payload for `addresses`. `lat`/`lng` are projected from the pin. */
export function addressToRow(address: DeliveryAddress, userId: string) {
  const coords = toLatLng({ x: address.x, y: address.y });
  return {
    id: address.id,
    user_id: userId,
    label_en: address.label.en,
    label_ar: address.label.ar,
    line_en: address.line.en,
    line_ar: address.line.ar,
    x: address.x,
    y: address.y,
    lat: coords.lat,
    lng: coords.lng,
    eta_minutes: address.etaMinutes,
    kind: address.kind ?? 'other',
    building: address.building ?? null,
    floor: address.floor ?? null,
    apartment: address.apartment ?? null,
    landmark: address.landmark ?? null,
    note: address.note ?? null
    ,phone: address.phone
  };
}

export function paymentFromRow(row: PaymentMethodRow): PaymentMethod {
  return {
    id: row.id,
    kind: row.kind,
    brand: row.brand ?? undefined,
    last4: row.last4 ?? undefined,
    expiry: row.expiry ?? undefined,
    phone: row.phone ?? undefined,
    removable: row.removable
  };
}

function linesFromRow(row: OrderRow): OrderLine[] {
  return (row.order_items ?? []).map((item) => ({
    productId: item.product_id,
    quantity: item.quantity,
    unitPrice: item.unit_price === undefined ? undefined : num(item.unit_price),
    name: item.name_en ? pair(item.name_en, item.name_ar ?? null) : undefined,
    image: item.products?.image_url
  }));
}

export function orderFromRow(row: OrderRow): Order {
  const snapshot = row.address_snapshot as unknown as DeliveryAddress;
  return {
    id: row.id,
    code: row.code,
    lines: linesFromRow(row),
    subtotal: num(row.subtotal),
    deliveryFee: num(row.delivery_fee),
    total: num(row.total),
    address: snapshot,
    status: row.status,
    placedAt: new Date(row.placed_at).getTime(),
    etaMinutes: row.eta_minutes,
    courier: row.courier_snapshot ?? UNASSIGNED_COURIER,
    paymentMethodId: row.payment_method_id ?? '',
    paymentKind: row.payment_kind,
    pointsEarned: row.points_earned ?? 0,
    cancelReason: row.cancel_reason ?? undefined
  };
}

export function opsOrderFromRow(row: OpsOrderRow): OpsOrder {
  return {
    ...orderFromRow(row),
    customerName: row.profiles?.name ?? '—',
    customerPhone: row.profiles?.phone ?? '',
    courierId: row.courier_id
  };
}

export function courierFromRow(row: CourierRow): CourierRecord {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials || initialsFrom(row.name),
    phone: row.phone,
    vehicle: row.vehicle,
    status: row.status,
    zoneId: row.zone_id,
    rating: num(row.rating, 5),
    linked: Boolean(row.user_id)
  };
}

export function revenueDayFromRow(row: RevenueDayRow): RevenueDay {
  return {
    day: row.day,
    orders: Number(row.orders_count) || 0,
    delivered: Number(row.delivered_count) || 0,
    revenue: num(row.revenue)
  };
}

export function topProductFromRow(row: TopProductRow): TopProduct {
  return {
    productId: row.product_id,
    name: pair(row.name_en, row.name_ar),
    units: Number(row.units) || 0,
    revenue: num(row.revenue)
  };
}

export function snapshotFromRow(row: OwnerTodayRow): StoreSnapshot {
  return {
    revenueToday: num(row.revenue_today),
    revenueYesterday: num(row.revenue_yesterday),
    revenue7d: num(row.revenue_7d),
    revenuePrev7d: num(row.revenue_prev_7d),
    revenue30d: num(row.revenue_30d),
    ordersToday: Number(row.orders_today) || 0,
    orders30d: Number(row.orders_30d) || 0
  };
}