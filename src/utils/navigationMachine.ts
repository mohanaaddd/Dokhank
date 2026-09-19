import type { AppRole, Screen, ScreenName, TabName } from '../types';

/**
 * Three finite screen graphs — one per role — instead of one graph with guards
 * bolted on. A customer's machine has no owner node in it at all, so an owner
 * screen is not merely hidden from them, it is unreachable.
 */
export interface NavGraph {
  initial: Screen;
  transitions: Partial<Record<ScreenName, ScreenName[]>>;
  tabs: TabName[];
  /** Screens that run full-bleed without the bottom tab bar. */
  fullscreen: ScreenName[];
}

const customer: NavGraph = {
  initial: { name: 'home' },
  tabs: ['home', 'search', 'profile'],
  fullscreen: ['welcome', 'auth', 'location', 'address', 'checkout', 'delivered'],
  transitions: {
    welcome: ['auth'],
    auth: ['welcome', 'home'],
    home: ['search', 'product', 'cart', 'profile', 'tracking', 'orders'],
    search: ['home', 'product', 'cart', 'profile'],
    product: ['home', 'search', 'cart', 'profile'],
    cart: ['home', 'search', 'product', 'location', 'profile'],
    location: ['cart', 'checkout', 'address'],
    address: ['location', 'profile'],
    checkout: ['location', 'cart', 'tracking'],
    tracking: ['home', 'delivered', 'profile', 'orders'],
    delivered: ['home', 'product', 'profile', 'orders'],
    orders: ['home', 'profile', 'tracking', 'delivered', 'cart'],
    profile: ['home', 'search', 'auth', 'tracking', 'orders', 'address']
  }
};

const courier: NavGraph = {
  initial: { name: 'courier_queue' },
  tabs: ['courier_queue', 'courier_active', 'courier_profile'],
  fullscreen: ['welcome', 'auth'],
  transitions: {
    welcome: ['auth'],
    auth: ['welcome', 'courier_queue'],
    courier_queue: ['courier_active', 'courier_profile'],
    courier_active: ['courier_queue', 'courier_profile'],
    courier_profile: ['courier_queue', 'courier_active', 'auth']
  }
};

const owner: NavGraph = {
  initial: { name: 'owner_orders' },
  tabs: ['owner_orders', 'owner_catalog', 'owner_insights', 'owner_profile'],
  fullscreen: ['welcome', 'auth', 'owner_product'],
  transitions: {
    welcome: ['auth'],
    auth: ['welcome', 'owner_orders'],
    owner_orders: ['owner_order', 'owner_catalog', 'owner_insights', 'owner_profile'],
    owner_order: ['owner_orders', 'owner_couriers', 'owner_profile'],
    owner_catalog: ['owner_product', 'owner_orders', 'owner_insights', 'owner_profile'],
    owner_product: ['owner_catalog'],
    owner_insights: ['owner_orders', 'owner_catalog', 'owner_profile'],
    owner_profile: ['owner_orders', 'owner_catalog', 'owner_insights', 'owner_couriers', 'auth'],
    owner_couriers: ['owner_profile', 'owner_orders']
  }
};

export const graphs: Record<AppRole, NavGraph> = { customer, courier, owner };

export function graphFor(role: AppRole | undefined): NavGraph {
  return graphs[role ?? 'customer'];
}

export function canNavigate(graph: NavGraph, from: ScreenName, to: ScreenName): boolean {
  return from === to || (graph.transitions[from] ?? []).includes(to);
}

export function tabForScreen(graph: NavGraph, screen: Screen): TabName | null {
  if (graph.tabs.includes(screen.name)) return screen.name;
  // Detail screens keep their parent tab lit.
  if (screen.name === 'owner_order') return 'owner_orders';
  if (screen.name === 'owner_product') return 'owner_catalog';
  return null;
}

export function screenKey(screen: Screen): string {
  if (screen.name === 'product') return `product:${screen.productId}`;
  if (screen.name === 'tracking') return `tracking:${screen.orderId}`;
  if (screen.name === 'delivered') return `delivered:${screen.orderId}`;
  if (screen.name === 'owner_order') return `owner_order:${screen.orderId}`;
  if (screen.name === 'owner_product') return `owner_product:${screen.productId ?? 'new'}`;
  return screen.name;
}