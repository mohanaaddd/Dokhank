import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { courierFromRow, opsOrderFromRow } from '../lib/mappers';
import type { CourierRow, OpsOrderRow } from '../lib/rows';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { AsyncStatus, CourierRecord, OpsOrder, OrderStatus } from '../types';

const ORDER_SELECT =
'id,code,user_id,courier_id,subtotal,delivery_fee,discount,total,address_snapshot,courier_snapshot,payment_method_id,payment_kind,status,eta_minutes,points_earned,placed_at,delivered_at,cancel_reason,profiles(name,phone),order_items(product_id,quantity,unit_price,name_en,name_ar,products(image_url))';

const COURIER_SELECT = 'id,user_id,name,initials,phone,vehicle,status,zone_id,rating';

type Shift = 'offline' | 'idle' | 'assigned' | 'delivering';

interface CourierContextValue {
  courier: CourierRecord | null;
  /** Unclaimed `confirmed` orders — RLS only lets couriers see these. */
  queue: OpsOrder[];
  /** The one order this courier is currently carrying. */
  active: OpsOrder | null;
  /** Everything they delivered today, for the profile tally. */
  history: OpsOrder[];
  status: AsyncStatus;
  onShift: boolean;
  setShift: (on: boolean) => Promise<void>;
  claim: (orderId: string) => Promise<void>;
  advance: (orderId: string, next: OrderStatus) => Promise<void>;
  refresh: () => Promise<void>;
}

const CourierContext = createContext<CourierContextValue | null>(null);

const OPEN: OrderStatus[] = ['confirmed', 'packing', 'on_the_way'];

export function CourierProvider({ children }: {children: React.ReactNode;}) {
  const { user } = useAuth();
  const [courier, setCourier] = useState<CourierRecord | null>(null);
  const [orders, setOrders] = useState<OpsOrder[]>([]);
  const [status, setStatus] = useState<AsyncStatus>('idle');

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: courierData }, { data: orderData, error }] = await Promise.all([
    supabase.from('couriers').select(COURIER_SELECT).eq('user_id', user.id).maybeSingle(),
    supabase.
    from('orders').
    select(ORDER_SELECT).
    order('placed_at', { ascending: false }).
    limit(60)]
    );

    if (courierData) setCourier(courierFromRow(courierData as unknown as CourierRow));
    if (error || !orderData) {
      setStatus('error');
      return;
    }
    setOrders((orderData as unknown as OpsOrderRow[]).map(opsOrderFromRow));
    setStatus('success');
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setStatus('loading');
    void refresh();
  }, [user, refresh]);

  /** The dispatch board is shared, so any order change is worth a refetch. */
  useEffect(() => {
    if (!user) return;
    const channel = supabase.
    channel(`dispatch:${user.id}`).
    on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      void refresh();
    }).
    subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const setShift = useCallback(
    async (on: boolean) => {
      if (!courier) return;
      const next: Shift = on ? 'idle' : 'offline';
      setCourier((prev) => prev ? { ...prev, status: next } : prev);
      await supabase.from('couriers').update({ status: next }).eq('id', courier.id);
    },
    [courier]
  );

  const claim = useCallback(
    async (orderId: string) => {
      const { error } = await supabase.rpc('fn_courier_claim_order', { p_order_id: orderId });
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const advance = useCallback(
    async (orderId: string, next: OrderStatus) => {
      const { error } = await supabase.rpc('fn_advance_order_status', {
        p_order_id: orderId,
        p_status: next
      });
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const value = useMemo<CourierContextValue>(() => {
    const mine = courier ? orders.filter((order) => order.courierId === courier.id) : [];
    return {
      courier,
      queue: orders.filter((order) => order.courierId === null && order.status === 'confirmed'),
      active: mine.find((order) => OPEN.includes(order.status)) ?? null,
      history: mine.filter((order) => order.status === 'delivered'),
      status,
      onShift: courier ? courier.status !== 'offline' : false,
      setShift,
      claim,
      advance,
      refresh
    };
  }, [courier, orders, status, setShift, claim, advance, refresh]);

  return <CourierContext.Provider value={value}>{children}</CourierContext.Provider>;
}

export function useCourier(): CourierContextValue {
  const ctx = useContext(CourierContext);
  if (!ctx) throw new Error('useCourier must be used inside CourierProvider');
  return ctx;
}