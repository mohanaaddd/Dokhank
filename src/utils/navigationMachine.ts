import type { Screen, ScreenName, TabName } from '../types';

/**
 * Finite screen graph. Every move is validated against this map, so the
 * shipping flow can never land somewhere the product does not allow.
 */
export const transitions: Record<ScreenName, ScreenName[]> = {
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
};

export const TABS: TabName[] = ['home', 'search', 'profile'];

/** Screens that run full-bleed without the bottom tab bar. */
export const fullscreenScreens: ScreenName[] = [
'welcome',
'auth',
'location',
'address',
'checkout',
'delivered'];


export function canNavigate(from: ScreenName, to: ScreenName): boolean {
  return from === to || transitions[from].includes(to);
}

export function tabForScreen(screen: Screen): TabName | null {
  if (screen.name === 'home' || screen.name === 'search' || screen.name === 'profile') {
    return screen.name;
  }
  return null;
}

export function screenKey(screen: Screen): string {
  if (screen.name === 'product') return `product:${screen.productId}`;
  if (screen.name === 'tracking') return `tracking:${screen.orderId}`;
  if (screen.name === 'delivered') return `delivered:${screen.orderId}`;
  return screen.name;
}