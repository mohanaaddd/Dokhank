import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addressToRow, orderFromRow } from '../lib/mappers';
import type { OrderRow, UserStatsRow } from '../lib/rows';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { AsyncStatus, CartLine, DeliveryAddress, Order } from '../types';

/**
 * Line items carry their own name and price snapshot, and join `products` only
 * for the image — so an order still renders correctly after a product is
 * renamed, repriced or pulled from the shop.
 */
export const ORDER_SELECT =
'id,code,subtotal,delivery_fee,discount,total,address_snapshot,courier_snapshot,payment_method_id,payment_kind,status,eta_minutes,points_earned,placed_at,delivered_at,cancel_reason,order_items(product_id,quantity,unit_price,name_en,name_ar,products(image_url))';

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [serverDelivered, setServerDelivered] = useState<number | null>(null);
  /** Mirrors `orders` so the realtime handler can test membership synchronously. */
  const known = useRef<Set<string>>(new Set());

  useEffect(() => {
    known.current = new Set(orders.map((order) => order.id));
  }, [orders]);

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
    order('placed_at', { ascending: false });
    if (error || !data) {
      setStatus('error');
      return;
    }
    setOrders((data as unknown as OrderRow[]).map(orderFromRow));
    setStatus('success');
  }, []);

  useEffect(() => {
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
    if (!user) return;
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
            status: row.status ?? order.status,
            etaMinutes: row.eta_minutes ?? order.etaMinutes,
            courier: row.courier_snapshot ?? order.courier,
            pointsEarned: row.points_earned ?? order.pointsEarned,
            cancelReason: row.cancel_reason ?? order.cancelReason
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
      if (!user) throw new Error('AUTH_REQUIRED');

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
    () => orders.find((order) => order.status !== 'delivered' && order.status !== 'cancelled') ?? null,
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