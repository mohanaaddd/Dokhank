import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, BikeIcon, SearchIcon } from 'lucide-react';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { Panel } from '../components/ui/Panel';
import { CategoryRail } from '../components/product/CategoryRail';
import { ProductCard } from '../components/product/ProductCard';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLocale } from '../contexts/LocaleContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useOrders } from '../contexts/OrderContext';
import { filterProducts, useCatalog } from '../hooks/useCatalog';
import { orderCode } from '../utils/format';
import type { CategoryId } from '../types';

export function Home() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { navigate, goToTab } = useNavigation();
  const { add, quantityOf, count } = useCart();
  const { activeOrder, orders } = useOrders();
  const { items, status, retry } = useCatalog();
  const [category, setCategory] = useState<CategoryId | 'all'>('all');

  const visible = filterProducts(items, '', category);

  const purchasedIds = Array.from(
    new Set(
      orders.
      filter((order) => order.status === 'delivered').
      flatMap((order) => order.lines.map((line) => line.productId))
    )
  );
  const buyAgain = purchasedIds.
  map((id) => items.find((product) => product.id === id)).
  filter((product): product is NonNullable<typeof product> => Boolean(product)).
  slice(0, 6);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="no-scrollbar flex-1 overflow-y-auto">
        <header className="flex items-center gap-3 px-4 pb-2 pt-5">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[10px] tracking-[0.24em] text-accent">
              {t('common.appName')}
            </p>
            <h1 className="truncate text-xl font-extrabold text-white">
              {t('home.greeting', { name: user?.name ?? 'friend' })}
            </h1>
          </div>
        </header>

        <div className="px-4 pt-2">
          <button
            type="button"
            onClick={() => goToTab('search')}
            className="flex h-12 w-full items-center gap-3 rounded-chunk border border-ink-600 bg-ink-800/70 px-4 text-start text-white/40 transition-colors duration-150 ease-pop hover:border-ink-500 hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            
            <SearchIcon className="h-5 w-5" />
            <span className="text-[15px]">{t('search.placeholder')}</span>
          </button>
        </div>

        {activeOrder &&
        <div className="px-4 pt-4">
            <button
            type="button"
            onClick={() => navigate({ name: 'tracking', orderId: activeOrder.id })}
            className="flex w-full items-center gap-3 rounded-chunk border border-neon-cyan/40 bg-neon-cyan/10 p-3 text-start transition-transform duration-150 ease-pop active:scale-[0.99]">
            
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neon-cyan/20">
                <BikeIcon className="h-5 w-5 text-neon-cyan" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[10px] tracking-[0.18em] text-neon-cyan">
                  {t('profile.activeOrder')} {orderCode(activeOrder.id)}
                </span>
                <span className="block truncate text-sm font-bold text-white">
                  {t(`tracking.${activeOrder.status}`)}
                </span>
              </span>
              <ArrowRightIcon className="h-5 w-5 shrink-0 text-neon-cyan rtl:rotate-180" />
            </button>
          </div>
        }

        <section className="px-4 pt-4" aria-label={t('home.heroTitle')}>
          <Panel
            tone="raised"
            className="relative overflow-hidden border-accent/30 p-5"
            style={{ backgroundColor: 'rgba(25,19,52,1)' }}>
            
            <div
              className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full opacity-25 blur-3xl"
              style={{ backgroundColor: 'var(--accent)' }}
              aria-hidden />
            
            <p className="font-display text-[10px] tracking-[0.24em] text-accent">
              {t('home.heroKicker')}
            </p>
            <h2 className="mt-2 max-w-[14ch] font-display text-[28px] leading-[1.05] text-white">
              {t('home.heroTitle')}
            </h2>
            <p className="mt-2 max-w-[28ch] text-[13px] text-white/55">{t('home.heroBody')}</p>
            <ChunkyButton size="sm" className="mt-4" onClick={() => setCategory('iqos_devices')}>
              {t('home.heroCta')}
            </ChunkyButton>
          </Panel>
        </section>

        {status === 'success' && buyAgain.length > 0 &&
        <section className="pt-6" aria-label={t('home.restock')}>
            <div className="px-4">
              <h2 className="font-display text-[11px] tracking-[0.2em] text-white/45">
                {t('home.restock')}
              </h2>
              <p className="mt-1 text-xs text-white/35">{t('home.restockBody')}</p>
            </div>
            <ul className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
              {buyAgain.map((product) =>
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              className="w-40 shrink-0"
              inCart={quantityOf(product.id)}
              onOpen={(id) => navigate({ name: 'product', productId: id })}
              onAdd={add} />

            )}
            </ul>
          </section>
        }

        <section className="px-4 pt-6" aria-label={t('home.categories')}>
          <h2 className="mb-3 font-display text-[11px] tracking-[0.2em] text-white/45">
            {t('home.categories')}
          </h2>
          <CategoryRail
            value={category}
            locale={locale}
            onChange={(value) => setCategory(value === 'favorites' ? 'all' : value)} />
          
        </section>

        <section className="px-4 pb-6 pt-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-[11px] tracking-[0.2em] text-white/45">
              {t('home.trending')}
            </h2>
            <button
              type="button"
              onClick={() => goToTab('search')}
              className="text-xs font-bold text-accent underline-offset-4 hover:underline">
              
              {t('home.seeAll')}
            </button>
          </div>

          {status === 'loading' &&
          <ul className="grid grid-cols-2 gap-3" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) =>
            <li
              key={index}
              className="h-64 animate-pulse rounded-chunk border border-ink-700 bg-ink-800/60" />

            )}
            </ul>
          }

          {status === 'error' &&
          <Panel className="flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-sm text-white/60">{t('common.error')}</p>
              <ChunkyButton size="sm" variant="dark" onClick={retry}>
                {t('common.retry')}
              </ChunkyButton>
            </Panel>
          }

          {status === 'success' && (
          visible.length === 0 ?
          <p className="py-10 text-center text-sm text-white/45">{t('home.empty')}</p> :

          <ul className="grid grid-cols-2 gap-3">
                {visible.map((product) =>
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              inCart={quantityOf(product.id)}
              onOpen={(id) => navigate({ name: 'product', productId: id })}
              onAdd={add} />

            )}
              </ul>)
          }
        </section>
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