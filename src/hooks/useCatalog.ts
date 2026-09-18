import { useEffect, useSyncExternalStore } from 'react';
import {
  ensureProduct,
  getSnapshot,
  loadCatalog,
  productById,
  subscribe } from
'../lib/catalogStore';
import type { CategoryId, Product } from '../types';

/**
 * Reads the `products` + `product_specs` tables through the shared catalog
 * cache. Components already handle loading and error states, so the swap from
 * mock data changed nothing above this line.
 */
export function useCatalog() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void loadCatalog();
  }, []);

  return {
    items: snapshot.items,
    status: snapshot.status,
    retry: () => {
      void loadCatalog(true);
    }
  };
}

export function useProduct(productId: string): Product | undefined {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void ensureProduct(productId);
  }, [productId]);

  return productById(productId);
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