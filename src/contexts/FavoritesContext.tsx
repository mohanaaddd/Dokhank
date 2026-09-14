import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface FavoritesContextValue {
  ids: string[];
  count: number;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: {children: React.ReactNode;}) {
  const [ids, setIds] = useState<string[]>([]);

  const toggle = useCallback((productId: string) => {
    setIds((prev) =>
    prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      ids,
      count: ids.length,
      isFavorite: (productId: string) => ids.includes(productId),
      toggle
    }),
    [ids, toggle]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}