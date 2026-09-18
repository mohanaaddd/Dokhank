import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PAYMENT_ID, paymentMethods as seeded } from '../data/payments';
import { paymentFromRow } from '../lib/mappers';
import type { PaymentMethodRow } from '../lib/rows';
import { supabase } from '../lib/supabase';
import { isLive } from '../lib/supabaseConfig';
import { useAuth } from './AuthContext';
import type { PaymentMethod } from '../types';

interface PaymentContextValue {
  methods: PaymentMethod[];
  /** The method preselected in settings and at checkout. Always resolvable. */
  defaultId: string;
  setDefaultMethod: (id: string) => void;
  removeMethod: (id: string) => void;
  addCard: () => void;
  getMethod: (id: string | undefined) => PaymentMethod | undefined;
}

const PaymentContext = createContext<PaymentContextValue | null>(null);

const METHOD_SELECT = 'id,kind,brand,last4,expiry,phone,removable,is_default';

/** Demo card details — Paymob tokenisation replaces this when cards go live. */
const DEMO_CARD = { brand: 'Mastercard', expiry: '11/29' };

export function PaymentProvider({ children }: {children: React.ReactNode;}) {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>(seeded);
  const [defaultId, setDefaultId] = useState<string>(DEFAULT_PAYMENT_ID);

  const hydrate = useCallback(async () => {
    const { data } = await supabase.from('payment_methods').select(METHOD_SELECT).order('created_at');
    if (!data) return;
    const rows = data as unknown as PaymentMethodRow[];
    if (rows.length === 0) return;
    setMethods(rows.map(paymentFromRow));
    setDefaultId((rows.find((row) => row.is_default) ?? rows[0]).id);
  }, []);

  useEffect(() => {
    if (!isLive || !user) return;
    void hydrate();
  }, [isLive, user, hydrate]);

  const setDefaultMethod = useCallback((id: string) => {
    setDefaultId(id);
    if (isLive && user) {
      void supabase.rpc('fn_set_default_payment_method', { p_method_id: id });
    }
  }, [user]);

  const removeMethod = useCallback(
    (id: string) => {
      setMethods((prev) => {
        const target = prev.find((entry) => entry.id === id);
        if (!target || !target.removable) return prev;
        const next = prev.filter((entry) => entry.id !== id);
        setDefaultId((current) => current === id ? next[0]?.id ?? current : current);
        return next;
      });
      if (isLive && user) {
        void supabase.rpc('fn_delete_payment_method', { p_method_id: id }).then(() => hydrate());
      }
    },
    [user, hydrate]
  );

  const addCard = useCallback(() => {
    const last4 = String(Math.floor(1000 + Math.random() * 9000));

    if (!isLive || !user) {
      setMethods((prev) => [
      ...prev,
      {
        id: `pay_${Date.now().toString(36)}`,
        kind: 'card',
        brand: DEMO_CARD.brand,
        last4,
        expiry: DEMO_CARD.expiry,
        removable: true
      }]
      );
      return;
    }

    void supabase.
    from('payment_methods').
    insert({
      user_id: user.id,
      kind: 'card',
      brand: DEMO_CARD.brand,
      last4,
      expiry: DEMO_CARD.expiry,
      removable: true
    }).
    then(() => hydrate());
  }, [user, hydrate]);

  const value = useMemo<PaymentContextValue>(
    () => ({
      methods,
      defaultId,
      setDefaultMethod,
      removeMethod,
      addCard,
      getMethod: (id) => methods.find((entry) => entry.id === id)
    }),
    [methods, defaultId, setDefaultMethod, removeMethod, addCard]
  );

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
}

export function usePayments(): PaymentContextValue {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error('usePayments must be used inside PaymentProvider');
  return ctx;
}