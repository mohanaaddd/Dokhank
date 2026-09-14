import { useEffect, useMemo, useState } from 'react';
import { products as catalog } from '../data/products';
import type { AsyncStatus, CategoryId, Product } from '../types';

/**
 * Stands in for a Supabase `products` query. Components already handle
 * loading and error states, so swapping the source later changes nothing else.
 */
export function useCatalog() {
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [items, setItems] = useState<Product[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setItems(catalog);
      setStatus('success');
    }, 520);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [attempt]);

  return {
    items,
    status,
    retry: () => setAttempt((value) => value + 1)
  };
}

export function useProduct(productId: string): Product | undefined {
  return useMemo(() => catalog.find((product) => product.id === productId), [productId]);
}

export function filterProducts(
items: Product[],
query: string,
category: CategoryId | 'all')
: Product[] {
  const term = query.trim().toLowerCase();
  return items.filter((product) => {
    const matchesCategory = category === 'all' || product.category === category;
    if (!matchesCategory) return false;
    if (!term) return true;
    return (
      product.name.en.toLowerCase().includes(term) ||
      product.name.ar.includes(term) ||
      product.tagline.en.toLowerCase().includes(term) ||
      product.category.includes(term));

  });
}