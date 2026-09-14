import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { products } from '../data/products';
import type { CartLine, DeliveryAddress, Product } from '../types';

export const DELIVERY_FEE = 25;
export const FREE_DELIVERY_OVER = 500;

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

const CartContext = createContext<CartContextValue | null>(null);

const byId = new Map(products.map((product) => [product.id, product]));

export function CartProvider({ children }: {children: React.ReactNode;}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [address, setAddress] = useState<DeliveryAddress | null>(null);

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
      const product = byId.get(line.productId);
      return product ? sum + product.price * line.quantity : sum;
    }, 0),
    [lines]
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
      resolve: (line: CartLine) => byId.get(line.productId)
    }),
    [lines, count, subtotal, deliveryFee, address, add, setQuantity, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}