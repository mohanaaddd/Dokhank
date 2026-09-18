import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { getSnapshot, loadCatalog, productById, subscribe } from '../lib/catalogStore';
import type { CartLine, DeliveryAddress, Product } from '../types';

export const DELIVERY_FEE = 25;
export const FREE_DELIVERY_OVER = 500;

const STORAGE_KEY = 'dokhan.cart.v1';

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  address: DeliveryAddress | null;
  setAddress: (address: DeliveryAddress | null) => void;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  quantityOf: (productId: string) => number;
  resolve: (line: CartLine) => Product | undefined;
}

interface StoredCart {
  lines: CartLine[];
  address: DeliveryAddress | null;
}

const CartContext = createContext<CartContextValue | null>(null);

/** The cart stays client-side; the totals are recomputed server-side on order. */
function readStored(): StoredCart {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lines: [], address: null };
    const parsed = JSON.parse(raw) as Partial<StoredCart>;
    const lines = Array.isArray(parsed.lines) ?
    parsed.lines.filter(
      (line): line is CartLine =>
      typeof line?.productId === 'string' && typeof line?.quantity === 'number'
    ) :
    [];
    const address =
    parsed.address && typeof parsed.address === 'object' ? parsed.address as DeliveryAddress : null;
    return { lines, address };
  } catch {
    return { lines: [], address: null };
  }
}

export function CartProvider({ children }: {children: React.ReactNode;}) {
  const stored = useMemo(readStored, []);
  const [lines, setLines] = useState<CartLine[]>(stored.lines);
  const [address, setAddress] = useState<DeliveryAddress | null>(stored.address);

  // Prices come from the catalog, so it has to be in memory for the cart to add up.
  const catalog = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, address }));
    } catch {

      /* storage can be unavailable in private mode — the cart just won't persist */}
  }, [lines, address]);

  const add = useCallback((productId: string, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.productId === productId);
      if (existing) {
        return prev.map((line) =>
        line.productId === productId ? { ...line, quantity: line.quantity + quantity } : line
        );
      }
      return [...prev, { productId, quantity }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
    quantity <= 0 ?
    prev.filter((line) => line.productId !== productId) :
    prev.map((line) => line.productId === productId ? { ...line, quantity } : line)
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((line) => line.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const subtotal = useMemo(
    () =>
    lines.reduce((sum, line) => {
      const product = productById(line.productId);
      return product ? sum + product.price * line.quantity : sum;
    }, 0),
    [lines, catalog]
  );

  const count = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const deliveryFee = subtotal >= FREE_DELIVERY_OVER || subtotal === 0 ? 0 : DELIVERY_FEE;

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      address,
      setAddress,
      add,
      setQuantity,
      remove,
      clear,
      quantityOf: (productId: string) =>
      lines.find((line) => line.productId === productId)?.quantity ?? 0,
      resolve: (line: CartLine) => productById(line.productId)
    }),
    [lines, count, subtotal, deliveryFee, address, add, setQuantity, remove, clear, catalog]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}