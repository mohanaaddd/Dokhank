import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { addresses as seeded } from '../data/addresses';
import type { DeliveryAddress } from '../types';

interface AddressContextValue {
  addresses: DeliveryAddress[];
  /** Inserts a new address, or replaces one that already carries the same id. */
  saveAddress: (address: DeliveryAddress) => void;
  removeAddress: (id: string) => void;
}

const AddressContext = createContext<AddressContextValue | null>(null);

export function AddressProvider({ children }: {children: React.ReactNode;}) {
  const [addresses, setAddresses] = useState<DeliveryAddress[]>(seeded);

  const saveAddress = useCallback((address: DeliveryAddress) => {
    setAddresses((prev) => {
      const exists = prev.some((entry) => entry.id === address.id);
      if (exists) return prev.map((entry) => entry.id === address.id ? address : entry);
      return [address, ...prev];
    });
  }, []);

  const removeAddress = useCallback((id: string) => {
    setAddresses((prev) => prev.filter((entry) => entry.id !== id));
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