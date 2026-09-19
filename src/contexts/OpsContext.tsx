import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { courierFromRow, opsOrderFromRow } from '../lib/mappers';
import type { CourierRow, OpsOrderRow } from '../lib/rows';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { AsyncStatus, CourierRecord, OpsOrder, OrderStatus } from '../types';

const ORDER_SELECT =
'id,code,user_id,courier_id,subtotal,delivery_fee,discount,total,address_snapshot,courier_snapshot,payment_method_id,payment_kind,status,eta_minutes,points_earned,placed_at,delivered_at,cancel_reason,profiles(name,phone),order_items(product_id,quantity,unit_price,name_en,name_ar,products(image_url))';

const COURIER_SELECT = 'id,user_id,name,initials,phone,vehicle,status,zone_id,rating';

interface NewCourier {
  id?: string;
  name: string;
  phone: string;
  vehicle: string;
}

interface OpsContextValue {
  orders: OpsOrder[];
  couriers: CourierRecord[];
  status: AsyncStatus;
  /** Store open/closed, read from and written to `app_settings`. */
  storeOpen: boolean;
  setStoreOpen: (open: boolean) => Promise<void>;
  advance: (orderId: string, next: OrderStatus) => Promise<void>;
  cancel: (orderId: string, reason: string) => Promise<void>;
  assign: (orderId: string, courierId: string) => Promise<void>;
  saveCourier: (courier: NewCourier) => Promise<void>;
  refresh: () => Promise<void>;
  getOrder: (id: string) => OpsOrder | undefined;
}

const OpsContext = createContext<OpsContextValue | null>(null);

export function OpsProvider({ children }: {children: React.ReactNode;}) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OpsOrder[]>([]);
  const [couriers, setCouriers] = useState<CourierRecord[]>([]);
  const [storeOpen, setStoreOpenState] = useState(true);
  const [status, setStatus] = useState<AsyncStatus>('idle');

  const refresh = useCallback(async () => {
    const [ordersRes, couriersRes, settingRes] = await Promise.all([
    supabase.
    from('orders').
    select(ORDER_SELECT).
    order('placed_at', { ascending: false }).
    limit(120),
    supabase.from('couriers').select(COURIER_SELECT).order('name'),
    supabase.from('app_settings').select('value').eq('key', 'delivery').maybeSingle()]
    );

    if (ordersRes.error || !ordersRes.data) {
      setStatus('error');
      return;
    }
    setOrders((ordersRes.data as unknown as OpsOrderRow[]).map(opsOrderFromRow));
    setCouriers(((couriersRes.data ?? []) as unknown as CourierRow[]).map(courierFromRow));

    const setting = (settingRes.data as {value?: Record<string, unknown>;} | null)?.value;
    if (setting && typeof setting.store_open === 'boolean') setStoreOpenState(setting.store_open);
    setStatus('success');
  }, []);

  useEffect(() => {
    if (!user) return;
    setStatus('loading');
    void refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.
    channel('ops:orders').
    on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      void refresh();
    }).
    subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, refresh]);

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

  const cancel = useCallback(
    async (orderId: string, reason: string) => {
      const { error } = await supabase.rpc('fn_owner_cancel_order', {
        p_order_id: orderId,
        p_reason: reason
      });
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const assign = useCallback(
    async (orderId: string, courierId: string) => {
      const { error } = await supabase.rpc('fn_assign_courier', {
        p_order_id: orderId,
        p_courier_id: courierId
      });
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const saveCourier = useCallback(
    async (courier: NewCourier) => {
      const { error } = await supabase.rpc('fn_owner_upsert_courier', {
        p_courier: {
          id: courier.id ?? null,
          name: courier.name,
          phone: courier.phone,
          vehicle: courier.vehicle
        }
      });
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const setStoreOpen = useCallback(
    async (open: boolean) => {
      setStoreOpenState(open);
      const { data } = await supabase.
      from('app_settings').
      select('value').
      eq('key', 'delivery').
      maybeSingle();
      const current = ((data as {value?: Record<string, unknown>;} | null)?.value ?? {}) as Record<
        string,
        unknown>;

      await supabase.rpc('fn_owner_set_setting', {
        p_key: 'delivery',
        p_value: { ...current, store_open: open }
      });
    },
    []
  );

  const value = useMemo<OpsContextValue>(
    () => ({
      orders,
      couriers,
      status,
      storeOpen,
      setStoreOpen,
      advance,
      cancel,
      assign,
      saveCourier,
      refresh,
      getOrder: (id: string) => orders.find((order) => order.id === id)
    }),
    [orders, couriers, status, storeOpen, setStoreOpen, advance, cancel, assign, saveCourier, refresh]
  );

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps(): OpsContextValue {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error('useOps must be used inside OpsProvider');
  return ctx;
}