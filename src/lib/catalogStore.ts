import { productFromRow } from './mappers';
import type { CategoryRow, ProductRow } from './rows';
import { supabase } from './supabase';
import type { AsyncStatus, Category, Product } from '../types';

/**
 * Module-level catalog cache. The catalog is public, immutable-ish data that
 * several screens read synchronously (`useProduct`, `cart.resolve`), so it is
 * fetched once and shared rather than re-queried per component.
 */

interface Snapshot {
  items: Product[];
  categories: Category[];
  status: AsyncStatus;
}

export const PRODUCT_SELECT =
'id,name_en,name_ar,tagline_en,tagline_ar,description_en,description_ar,price,compare_at_price,image_url,category_id,rating,review_count,stock,badge,is_active,product_specs(label_en,label_ar,value_en,value_ar,sort_order)';

let snapshot: Snapshot = { items: [], categories: [], status: 'idle' };
let index = new Map<string, Product>();
let inFlight: Promise<void> | null = null;

const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  index = new Map(next.items.map((product) => [product.id, product]));
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Snapshot {
  return snapshot;
}

export function productById(id: string): Product | undefined {
  return index.get(id);
}

async function fetchCatalog(): Promise<void> {
  publish({ ...snapshot, status: 'loading' });

  const [productRes, categoryRes] = await Promise.all([
  supabase.from('products').select(PRODUCT_SELECT).eq('is_active', true),
  supabase.from('categories').select('id,label_en,label_ar,icon,sort_order').order('sort_order')]
  );

  if (productRes.error || !productRes.data) {
    publish({ ...snapshot, status: 'error' });
    return;
  }

  const items = (productRes.data as unknown as ProductRow[]).map(productFromRow);

  const categories = ((categoryRes.data ?? []) as unknown as CategoryRow[]).map((row) => ({
    id: row.id,
    label: { en: row.label_en, ar: row.label_ar || row.label_en },
    icon: row.icon
  }));

  // Trending order drives the home rails; fall back to rating when the
  // materialized view has not been refreshed yet.
  const { data: trending } = await supabase.from('v_trending_products').select('id,sold_30d');

  const rank = new Map<string, number>(
    ((trending ?? []) as Array<{id: string;sold_30d: number;}>).map((row) => [
    row.id,
    Number(row.sold_30d) || 0]
    )
  );

  items.sort((a, b) => {
    const delta = (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0);
    return delta !== 0 ? delta : b.rating - a.rating;
  });

  publish({ items, categories, status: 'success' });
}

/** Loads the catalog once. `force` re-runs it (the retry button). */
export function loadCatalog(force = false): Promise<void> {
  if (!force && (snapshot.status === 'success' || inFlight)) return inFlight ?? Promise.resolve();
  inFlight = fetchCatalog().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Deep-link safety net: pull a single product that is not in the cache yet. */
export async function ensureProduct(id: string): Promise<void> {
  if (index.has(id)) return;
  const { data, error } = await supabase.
  from('products').
  select(PRODUCT_SELECT).
  eq('id', id).
  maybeSingle();
  if (error || !data) return;
  const product = productFromRow(data as unknown as ProductRow);
  publish({ ...snapshot, items: [...snapshot.items, product] });
}