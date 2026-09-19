import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon } from 'lucide-react';
import { Toggle } from '../ui/Toggle';
import { formatPrice, localize } from '../../utils/format';
import type { Locale, Product } from '../../types';

interface CatalogRowProps {
  product: Product;
  locale: Locale;
  onPatch: (
  id: string,
  changes: {price?: number;stock?: number;isActive?: boolean;})
  => Promise<void>;
  onOpen: () => void;
}

/**
 * Price and stock are the two numbers an owner changes daily, so they are
 * editable in place; everything else lives behind the edit sheet.
 */
export function CatalogRow({ product, locale, onPatch, onOpen }: CatalogRowProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<'price' | 'stock' | null>(null);
  const [draft, setDraft] = useState('');

  const active = product.isActive !== false;
  const soldOut = product.stock === 0;

  const begin = (field: 'price' | 'stock') => {
    setEditing(field);
    setDraft(String(field === 'price' ? product.price : product.stock));
  };

  const commit = () => {
    const value = Number(draft);
    const field = editing;
    setEditing(null);
    if (!field || !Number.isFinite(value) || value < 0) return;
    const current = field === 'price' ? product.price : product.stock;
    if (value === current) return;
    void onPatch(product.id, field === 'price' ? { price: value } : { stock: Math.round(value) });
  };

  return (
    <li
      className={[
      'flex items-center gap-3 rounded-2xl border p-2.5 transition-opacity duration-150',
      active ? 'border-ink-600/70 bg-ink-800/50' : 'border-ink-700 bg-ink-800/25 opacity-60'].
      join(' ')}>
      
      <img
        src={product.image}
        alt=""
        className="h-12 w-12 shrink-0 rounded-xl bg-ink-950 object-cover" />
      

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-white">
          {localize(product.name, locale)}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs">
          {editing === 'price' ?
          <input
            autoFocus
            inputMode="decimal"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            aria-label={t('owner.price')}
            className="w-20 rounded-lg border border-accent bg-ink-900 px-2 py-1 font-display text-xs text-white focus:outline-none" /> :


          <button
            type="button"
            onClick={() => begin('price')}
            className="font-display text-xs text-accent underline-offset-4 hover:underline">
            
              {formatPrice(product.price, locale)}
            </button>
          }

          {editing === 'stock' ?
          <input
            autoFocus
            inputMode="numeric"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            aria-label={t('owner.stock')}
            className="w-16 rounded-lg border border-accent bg-ink-900 px-2 py-1 font-display text-xs text-white focus:outline-none" /> :


          <button
            type="button"
            onClick={() => begin('stock')}
            className={[
            'font-bold underline-offset-4 hover:underline',
            soldOut ? 'text-neon-magenta' : 'text-white/45'].
            join(' ')}>
            
              {soldOut ? t('owner.soldOut') : t('owner.inStock', { count: product.stock })}
            </button>
          }
        </div>
      </div>

      <Toggle
        checked={active}
        onChange={() => void onPatch(product.id, { isActive: !active })}
        label={t('owner.activeToggle')} />
      

      <button
        type="button"
        onClick={onOpen}
        aria-label={t('owner.editProduct')}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-600 text-white/50 transition-colors duration-150 hover:border-ink-500 hover:text-white">
        
        <PencilIcon className="h-4 w-4" />
      </button>
    </li>);

}