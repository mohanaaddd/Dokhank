import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addressFromRow, addressToRow } from '../lib/mappers';
import type { AddressRow } from '../lib/rows';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { DeliveryAddress } from '../types';

interface AddressContextValue {
  addresses: DeliveryAddress[];
  /** Inserts a new address, or replaces one that already carries the same id. */
  saveAddress: (address: DeliveryAddress) => void;
  removeAddress: (id: string) => void;
}

const AddressContext = createContext<AddressContextValue | null>(null);

const ADDRESS_SELECT =
'id,label_en,label_ar,line_en,line_ar,x,y,eta_minutes,kind,building,floor,apartment,landmark,note,is_default,phone';

export function AddressProvider({ children }: {children: React.ReactNode;}) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.
      from('addresses').
      select(ADDRESS_SELECT).
      order('is_default', { ascending: false }).
      order('created_at', { ascending: false });
      if (cancelled || !data) return;
      setAddresses((data as unknown as AddressRow[]).map(addressFromRow));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveAddress = useCallback(
    (address: DeliveryAddress) => {
      setAddresses((prev) => {
        const exists = prev.some((entry) => entry.id === address.id);
        if (exists) return prev.map((entry) => entry.id === address.id ? address : entry);
        return [address, ...prev];
      });
      if (user) void supabase.from('addresses').upsert(addressToRow(address, user.id));
    },
    [user]
  );

  const removeAddress = useCallback((id: string) => {
    setAddresses((prev) => prev.filter((entry) => entry.id !== id));
    void supabase.from('addresses').delete().eq('id', id);
  }, []);

  const value = useMemo<AddressContextValue>(
    () => ({ addresses, saveAddress, removeAddress }),
    [addresses, saveAddress, removeAddress]
  );

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddresses(): AddressContextValue {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error('useAddresses must be used inside AddressProvider');
  return ctx;
}