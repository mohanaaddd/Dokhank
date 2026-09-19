import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { ChunkyButton } from '../../components/ui/ChunkyButton';
import { CatalogRow } from '../../components/owner/CatalogRow';
import { useLocale } from '../../contexts/LocaleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useOwnerCatalog } from '../../hooks/useOwnerCatalog';
import { localize } from '../../utils/format';

export function Catalog() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { navigate } = useNavigation();
  const { items, categories, status, patch } = useOwnerCatalog();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term ?
    items.filter(
      (item) =>
      item.name.en.toLowerCase().includes(term) ||
      item.name.ar.includes(term) ||
      item.id.includes(term)
    ) :
    items;
    return categories.
    map((category) => ({
      category,
      products: filtered.filter((item) => item.category === category.id)
    })).
    filter((group) => group.products.length > 0);
  }, [items, categories, query]);

  const outOfStock = items.filter((item) => item.stock === 0 && item.isActive).length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="sticky top-0 z-20 border-b border-ink-700/80 bg-ink-900/90 px-4 py-4 backdrop-blur">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] tracking-[0.22em] text-accent">
              {t('owner.catalogKicker')}
            </p>
            <h1 className="mt-1 font-display text-xl text-white">
              {t('owner.catalogCount', { count: items.length })}
            </h1>
          </div>
          <ChunkyButton
            size="sm"
            onClick={() => navigate({ name: 'owner_product', productId: null })}>
            
            <PlusIcon className="h-4 w-4" />
            {t('owner.newProduct')}
          </ChunkyButton>
        </div>

        {outOfStock > 0 &&
        <p className="mt-3 rounded-2xl border border-neon-amber/40 bg-neon-amber/[0.08] px-3 py-2 text-xs font-bold text-neon-amber">
            {t('owner.outOfStockWarning', { count: outOfStock })}
          </p>
        }

        <div className="relative mt-3">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('owner.searchCatalog')}
            aria-label={t('owner.searchCatalog')}
            className="w-full rounded-2xl border border-ink-600 bg-ink-800/70 py-2.5 pe-3 ps-9 text-sm text-white placeholder:text-white/25 focus:border-accent focus:outline-none" />
          
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {status === 'loading' && items.length === 0 &&
        <p className="py-20 text-center text-sm text-white/40">{t('common.loading')}</p>
        }

        {groups.map((group) =>
        <section key={group.category.id} className="mt-6 first:mt-0">
            <h2 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
              {localize(group.category.label, locale)}
            </h2>
            <ul className="flex flex-col gap-2">
              {group.products.map((product) =>
            <CatalogRow
              key={product.id}
              product={product}
              locale={locale}
              onPatch={patch}
              onOpen={() => navigate({ name: 'owner_product', productId: product.id })} />

            )}
            </ul>
          </section>
        )}

        {status === 'success' && groups.length === 0 &&
        <p className="py-20 text-center text-sm text-white/40">{t('owner.catalogEmpty')}</p>
        }
      </div>
    </div>);

}