import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { FavoriteRow } from '../lib/rows';
import { supabase } from '../lib/supabase';
import { isLive } from '../lib/supabaseConfig';
import { useAuth } from './AuthContext';

interface FavoritesContextValue {
  ids: string[];
  count: number;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: {children: React.ReactNode;}) {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isLive) return;
    if (!user) {
      setIds([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.from('favorites').select('product_id');
      if (cancelled || !data) return;
      setIds((data as unknown as FavoriteRow[]).map((row) => row.product_id));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggle = useCallback(
    (productId: string) => {
      const removing = ids.includes(productId);
      setIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
      if (!isLive || !user) return;
      if (removing) {
        void supabase.from('favorites').delete().eq('product_id', productId);
      } else {
        void supabase.
        from('favorites').
        upsert({ user_id: user.id, product_id: productId }, { onConflict: 'user_id,product_id' });
      }
    },
    [ids, user]
  );

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