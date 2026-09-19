import { useCallback, useEffect, useState } from 'react';
import { revenueDayFromRow, snapshotFromRow, topProductFromRow } from '../lib/mappers';
import type { OwnerTodayRow, RevenueDayRow, TopProductRow } from '../lib/rows';
import { supabase } from '../lib/supabase';
import type { AsyncStatus, RevenueDay, StoreSnapshot, TopProduct } from '../types';

const EMPTY: StoreSnapshot = {
  revenueToday: 0,
  revenueYesterday: 0,
  revenue7d: 0,
  revenuePrev7d: 0,
  revenue30d: 0,
  ordersToday: 0,
  orders30d: 0
};

/** Reads the three owner-only analytics views in one pass. */
export function useInsights() {
  const [snapshot, setSnapshot] = useState<StoreSnapshot>(EMPTY);
  const [days, setDays] = useState<RevenueDay[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [status, setStatus] = useState<AsyncStatus>('idle');

  const refresh = useCallback(async () => {
    setStatus('loading');
    const [todayRes, daysRes, topRes] = await Promise.all([
    supabase.from('v_owner_today').select('*').maybeSingle(),
    supabase.from('v_owner_revenue_daily').select('*'),
    supabase.from('v_owner_top_products').select('*').limit(5)]
    );

    if (todayRes.error && daysRes.error) {
      setStatus('error');
      return;
    }

    if (todayRes.data) setSnapshot(snapshotFromRow(todayRes.data as unknown as OwnerTodayRow));
    setDays(((daysRes.data ?? []) as unknown as RevenueDayRow[]).map(revenueDayFromRow));
    setTop(((topRes.data ?? []) as unknown as TopProductRow[]).map(topProductFromRow));
    setStatus('success');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { snapshot, days, top, status, refresh };
}