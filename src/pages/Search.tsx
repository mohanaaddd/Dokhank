import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchIcon, SearchXIcon, XIcon } from 'lucide-react';
import { CategoryRail, type FilterId } from '../components/product/CategoryRail';
import { ProductCard } from '../components/product/ProductCard';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { useCart } from '../contexts/CartContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useLocale } from '../contexts/LocaleContext';
import { useNavigation } from '../contexts/NavigationContext';
import { filterProducts, useCatalog } from '../hooks/useCatalog';

export function Search() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { navigate } = useNavigation();
  const { add, quantityOf, count } = useCart();
  const { isFavorite, count: favoriteCount } = useFavorites();
  const { items, status, retry } = useCatalog();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FilterId>('all');

  const onlyFavorites = category === 'favorites';
  const pool = onlyFavorites ? items.filter((product) => isFavorite(product.id)) : items;
  const results = filterProducts(pool, query, onlyFavorites ? 'all' : category);
  const showResults = query.trim().length > 0 || category !== 'all';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="sticky top-0 z-20 border-b border-ink-700/80 bg-ink-900/95 px-4 pb-3 pt-5 backdrop-blur">
        <h1 className="mb-3 font-display text-lg text-white">{t('search.title')}</h1>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={query}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.placeholder')}
            aria-label={t('search.title')}
            className="h-12 w-full rounded-chunk border border-ink-600 bg-ink-800 ps-12 pe-11 text-[15px] font-semibold text-white placeholder:text-white/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40" />
          
          {query &&
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t('search.clear')}
            className="absolute end-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-ink-600 text-white/70 transition-colors duration-150 hover:bg-ink-500">
            
              <XIcon className="h-4 w-4" strokeWidth={2.6} />
            </button>
          }
        </div>
        <div className="pt-3">
          <CategoryRail
            value={category}
            locale={locale}
            showFavorites={favoriteCount > 0}
            onChange={setCategory} />
          
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {!showResults &&
        <section>
            <h2 className="mb-3 font-display text-[11px] tracking-[0.2em] text-white/45">
              {t('search.suggestions')}
            </h2>
            <ul className="grid grid-cols-2 gap-3">
              {items.slice(0, 6).map((product) =>
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              inCart={quantityOf(product.id)}
              onOpen={(id) => navigate({ name: 'product', productId: id })}
              onAdd={add} />

            )}
            </ul>
          </section>
        }

        {showResults && status === 'loading' &&
        <ul className="grid grid-cols-2 gap-3" aria-busy="true">
            {Array.from({ length: 4 }).map((_, index) =>
          <li key={index} className="h-64 animate-pulse rounded-chunk border border-ink-700 bg-ink-800/60" />
          )}
          </ul>
        }

        {showResults && status === 'error' &&
        <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-white/60">{t('common.error')}</p>
            <ChunkyButton size="sm" variant="dark" onClick={retry}>
              {t('common.retry')}
            </ChunkyButton>
          </div>
        }

        {showResults && status === 'success' && (
        results.length === 0 ?
        <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-blob border border-ink-600 bg-ink-800">
                <SearchXIcon className="h-7 w-7 text-white/40" />
              </span>
              <p className="font-display text-base text-white">
                {onlyFavorites && !query.trim() ?
            t('search.favoritesEmpty') :
            t('search.noResults', { query })}
              </p>
              <p className="max-w-[24ch] text-sm text-white/45">{t('search.noResultsBody')}</p>
            </div> :

        <>
              <p className="mb-3 font-display text-[11px] tracking-[0.2em] text-white/45">
                {t('search.resultsCount', { count: results.length })}
              </p>
              <ul className="grid grid-cols-2 gap-3">
                {results.map((product) =>
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              inCart={quantityOf(product.id)}
              onOpen={(id) => navigate({ name: 'product', productId: id })}
              onAdd={add} />

            )}
              </ul>
            </>)

        }
      </div>

      {count > 0 &&
      <div className="border-t border-ink-700 bg-ink-900/95 px-4 py-3">
          <ChunkyButton fullWidth onClick={() => navigate({ name: 'cart' })}>
            {t('product.viewCart')}, {count}
          </ChunkyButton>
        </div>
      }
    </div>);

}