import { useCallback, useEffect, useState } from 'react';
import { PRODUCT_SELECT } from '../lib/catalogStore';
import { productFromRow, productToRow } from '../lib/mappers';
import type { CategoryRow, ProductRow } from '../lib/rows';
import { supabase } from '../lib/supabase';
import type { AsyncStatus, Category, Product } from '../types';

/**
 * The owner's view of the catalog: inactive products included, sorted by
 * category then name so the list reads like a shelf rather than a feed.
 */
export function useOwnerCatalog() {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<AsyncStatus>('idle');

  const refresh = useCallback(async () => {
    setStatus('loading');
    const [productRes, categoryRes] = await Promise.all([
    supabase.from('products').select(PRODUCT_SELECT),
    supabase.from('categories').select('id,label_en,label_ar,icon,sort_order').order('sort_order')]
    );

    if (productRes.error || !productRes.data) {
      setStatus('error');
      return;
    }

    const next = (productRes.data as unknown as ProductRow[]).map(productFromRow);
    next.sort((a, b) =>
    a.category === b.category ?
    a.name.en.localeCompare(b.name.en) :
    a.category.localeCompare(b.category)
    );
    setItems(next);
    setCategories(
      ((categoryRes.data ?? []) as unknown as CategoryRow[]).map((row) => ({
        id: row.id,
        label: { en: row.label_en, ar: row.label_ar || row.label_en },
        icon: row.icon
      }))
    );
    setStatus('success');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Inline edits from the list — price, stock, active. Audited server-side. */
  const patch = useCallback(
    async (id: string, changes: {price?: number;stock?: number;isActive?: boolean;}) => {
      setItems((prev) =>
      prev.map((item) =>
      item.id === id ?
      {
        ...item,
        price: changes.price ?? item.price,
        stock: changes.stock ?? item.stock,
        isActive: changes.isActive ?? item.isActive
      } :
      item
      )
      );
      const { error } = await supabase.rpc('fn_owner_patch_product', {
        p_id: id,
        p_price: changes.price ?? null,
        p_stock: changes.stock ?? null,
        p_is_active: changes.isActive ?? null
      });
      if (error) {
        await refresh();
        throw error;
      }
    },
    [refresh]
  );

  const save = useCallback(
    async (product: Product) => {
      const { error } = await supabase.rpc('fn_owner_update_product', {
        p_product: productToRow(product)
      });
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  return { items, categories, status, refresh, patch, save };
}

/** Uploads to the public `product-images` bucket and returns the public URL. */
export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop() ?? 'jpg';
  const path = `${productId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.
  from('product-images').
  upload(path, file, { cacheControl: '3600', upsert: true });
  if (error) throw error;
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}