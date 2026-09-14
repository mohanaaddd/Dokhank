import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addresses } from '../data/addresses';
import type { AsyncStatus, CartLine, DeliveryAddress, Order, OrderStatus } from '../types';

const DAY = 86_400_000;

/** Mock order history so the orders screen has something to show. */
const seededOrders: Order[] = [
{
  id: 'ord_eg2481',
  lines: [
  { productId: 'terea-amber', quantity: 2 },
  { productId: 'cleopatra-box', quantity: 1 }],

  subtotal: 358,
  deliveryFee: 25,
  total: 383,
  address: addresses[0],
  status: 'delivered',
  placedAt: Date.now() - 2 * DAY,
  etaMinutes: 22,
  courier: { name: 'Dina', vehicle: 'Scooter, NX-42', initials: 'DN' }
},
{
  id: 'ord_eg1907',
  lines: [
  { productId: 'iluma-one', quantity: 1 },
  { productId: 'iqos-leather-case', quantity: 1 }],

  subtotal: 3350,
  deliveryFee: 0,
  total: 3350,
  address: addresses[1],
  status: 'delivered',
  placedAt: Date.now() - 11 * DAY,
  etaMinutes: 31,
  courier: { name: 'Karim', vehicle: 'Scooter, MZ-08', initials: 'KM' }
}];


/** Wall-clock offsets that stand in for Supabase Realtime status pushes. */
const STATUS_TIMELINE: Array<{status: OrderStatus;afterMs: number;}> = [
{ status: 'packing', afterMs: 3200 },
{ status: 'on_the_way', afterMs: 7600 },
{ status: 'delivered', afterMs: 16000 }];


interface PlaceOrderInput {
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  address: DeliveryAddress;
}

interface OrderContextValue {
  orders: Order[];
  activeOrder: Order | null;
  status: AsyncStatus;
  placeOrder: (input: PlaceOrderInput) => Promise<Order>;
  getOrder: (id: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: {children: React.ReactNode;}) {
  const [orders, setOrders] = useState<Order[]>(seededOrders);
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const placeOrder = useCallback(async (input: PlaceOrderInput) => {
    setStatus('loading');
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const order: Order = {
      id: `ord_${Date.now().toString(36)}`,
      lines: input.lines,
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      total: input.subtotal + input.deliveryFee,
      address: input.address,
      status: 'confirmed',
      placedAt: Date.now(),
      etaMinutes: input.address.etaMinutes,
      courier: { name: 'Dina', vehicle: 'Scooter, NX-42', initials: 'DN' }
    };

    setOrders((prev) => [order, ...prev]);
    setStatus('success');

    STATUS_TIMELINE.forEach(({ status: next, afterMs }) => {
      const timer = window.setTimeout(() => {
        setOrders((prev) =>
        prev.map((entry) => entry.id === order.id ? { ...entry, status: next } : entry)
        );
      }, afterMs);
      timers.current.push(timer);
    });

    return order;
  }, []);

  const activeOrder = useMemo(
    () => orders.find((order) => order.status !== 'delivered') ?? null,
    [orders]
  );

  const value = useMemo<OrderContextValue>(
    () => ({
      orders,
      activeOrder,
      status,
      placeOrder,
      getOrder: (id: string) => orders.find((order) => order.id === id)
    }),
    [orders, activeOrder, status, placeOrder]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used inside OrderProvider');
  return ctx;
}