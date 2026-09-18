import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addresses } from '../data/addresses';
import { addressToRow, orderFromRow } from '../lib/mappers';
import type { OrderRow, UserStatsRow } from '../lib/rows';
import { supabase } from '../lib/supabase';
import { isLive } from '../lib/supabaseConfig';
import { useAuth } from './AuthContext';
import type { AsyncStatus, CartLine, DeliveryAddress, Order, OrderStatus } from '../types';

const DAY = 86_400_000;

/** Mock order history, used only until the Supabase key is in place. */
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
  courier: { name: 'Dina', vehicle: 'Scooter, NX-42', initials: 'DN' },
  paymentMethodId: 'pay_cash'
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
  courier: { name: 'Karim', vehicle: 'Scooter, MZ-08', initials: 'KM' },
  paymentMethodId: 'pay_visa'
}];


/** Mock progression — replaced by Supabase Realtime once the key is set. */
const STATUS_TIMELINE: Array<{status: OrderStatus;afterMs: number;}> = [
{ status: 'packing', afterMs: 3200 },
{ status: 'on_the_way', afterMs: 7600 },
{ status: 'delivered', afterMs: 16000 }];


const ORDER_SELECT =
'id,code,subtotal,delivery_fee,discount,total,address_snapshot,courier_snapshot,payment_method_id,payment_kind,status,eta_minutes,points_earned,placed_at,delivered_at,order_items(product_id,quantity,unit_price)';

interface PlaceOrderInput {
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  address: DeliveryAddress;
  paymentMethodId: string;
}

interface OrderContextValue {
  orders: Order[];
  activeOrder: Order | null;
  status: AsyncStatus;
  /** Completed deliveries — drives the accent unlock tiers. */
  deliveredCount: number;
  placeOrder: (input: PlaceOrderInput) => Promise<Order>;
  getOrder: (id: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: {children: React.ReactNode;}) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>(isLive ? [] : seededOrders);
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [serverDelivered, setServerDelivered] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  /** Mirrors `orders` so the realtime handler can test membership synchronously. */
  const known = useRef<Set<string>>(new Set());

  useEffect(() => {
    known.current = new Set(orders.map((order) => order.id));
  }, [orders]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const refreshStats = useCallback(async () => {
    const { data } = await supabase.
    from('v_user_stats').
    select('points,delivered_orders_count,orders_count').
    maybeSingle();
    const row = data as unknown as UserStatsRow | null;
    if (row) setServerDelivered(Number(row.delivered_orders_count) || 0);
  }, []);

  const refreshOrders = useCallback(async () => {
    const { data, error } = await supabase.
    from('orders').
    select(ORDER_SELECT).
    neq('status', 'cancelled').
    order('placed_at', { ascending: false });
    if (error || !data) {
      setStatus('error');
      return;
    }
    setOrders((data as unknown as OrderRow[]).map(orderFromRow));
    setStatus('success');
  }, []);

  useEffect(() => {
    if (!isLive) return;
    if (!user) {
      setOrders([]);
      setServerDelivered(null);
      return;
    }
    setStatus('loading');
    void refreshOrders();
    void refreshStats();
  }, [user, refreshOrders, refreshStats]);

  /** Live status: `orders` rows for this member push straight into state. */
  useEffect(() => {
    if (!isLive || !user) return;
    const channel = supabase.
    channel(`orders:${user.id}`).
    on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
      (payload) => {
        const row = payload.new as Partial<OrderRow> | null;
        if (!row?.id) return;
        const isKnown = known.current.has(row.id);
        setOrders((prev) => {
          if (!isKnown) return prev;
          return prev.map((order) =>
          order.id === row.id ?
          {
            ...order,
            status: row.status === 'cancelled' ? order.status : row.status ?? order.status,
            etaMinutes: row.eta_minutes ?? order.etaMinutes,
            courier: row.courier_snapshot ?? order.courier,
            pointsEarned: row.points_earned ?? order.pointsEarned
          } :
          order
          );
        });
        if (!isKnown) void refreshOrders();
        if (row.status === 'delivered') void refreshStats();
      }
    ).
    subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, refreshOrders, refreshStats]);

  const placeOrder = useCallback(
    async (input: PlaceOrderInput) => {
      setStatus('loading');

      if (!isLive || !user) {
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
          courier: { name: 'Dina', vehicle: 'Scooter, NX-42', initials: 'DN' },
          paymentMethodId: input.paymentMethodId
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
      }

      // Totals, stock and the delivery fee are all recomputed inside the RPC —
      // the client values are only used for the optimistic UI before it returns.
      const { data, error } = await supabase.rpc('fn_place_order', {
        p_items: input.lines.map((line) => ({
          product_id: line.productId,
          quantity: line.quantity
        })),
        p_address: addressToRow(input.address, user.id),
        p_payment_method_id: input.paymentMethodId,
        p_promo_code: null
      });

      if (error || !data) {
        setStatus('error');
        throw error ?? new Error('orderFailed');
      }

      const order = orderFromRow(data as unknown as OrderRow);
      setOrders((prev) => [order, ...prev.filter((entry) => entry.id !== order.id)]);
      setStatus('success');
      return order;
    },
    [user]
  );

  const activeOrder = useMemo(
    () => orders.find((order) => order.status !== 'delivered') ?? null,
    [orders]
  );

  const localDelivered = useMemo(
    () => orders.filter((order) => order.status === 'delivered').length,
    [orders]
  );

  const deliveredCount = serverDelivered ?? localDelivered;

  const value = useMemo<OrderContextValue>(
    () => ({
      orders,
      activeOrder,
      status,
      deliveredCount,
      placeOrder,
      getOrder: (id: string) => orders.find((order) => order.id === id)
    }),
    [orders, activeOrder, status, deliveredCount, placeOrder]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used inside OrderProvider');
  return ctx;
}