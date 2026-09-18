import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_PAYMENT_ID, paymentMethods as seeded } from '../data/payments';
import type { PaymentMethod } from '../types';

interface PaymentContextValue {
  methods: PaymentMethod[];
  /** The method preselected in settings and at checkout. */
  defaultId: string;
  setDefaultMethod: (id: string) => void;
  removeMethod: (id: string) => void;
  addCard: () => void;
  getMethod: (id: string | undefined) => PaymentMethod | undefined;
}

const PaymentContext = createContext<PaymentContextValue | null>(null);

export function PaymentProvider({ children }: {children: React.ReactNode;}) {
  const [methods, setMethods] = useState<PaymentMethod[]>(seeded);
  const [defaultId, setDefaultId] = useState<string>(DEFAULT_PAYMENT_ID);

  const setDefaultMethod = useCallback((id: string) => setDefaultId(id), []);

  const removeMethod = useCallback(
    (id: string) => {
      setMethods((prev) => {
        const next = prev.filter((entry) => entry.id !== id || !entry.removable);
        setDefaultId((current) =>
        current === id ? next[0]?.id ?? DEFAULT_PAYMENT_ID : current
        );
        return next;
      });
    },
    []
  );

  const addCard = useCallback(() => {
    const last4 = String(Math.floor(1000 + Math.random() * 9000));
    setMethods((prev) => [
    ...prev,
    {
      id: `pay_${Date.now().toString(36)}`,
      kind: 'card',
      brand: 'Mastercard',
      last4,
      expiry: '11/29',
      removable: true
    }]
    );
  }, []);

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