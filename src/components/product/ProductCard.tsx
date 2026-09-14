import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeartIcon, PlusIcon, StarIcon } from 'lucide-react';
import { NeonBadge } from '../ui/NeonBadge';
import { useFavorites } from '../../contexts/FavoritesContext';
import { formatPrice, localize } from '../../utils/format';
import type { Locale, Product } from '../../types';

interface ProductCardProps {
  product: Product;
  locale: Locale;
  layout?: 'grid' | 'row';
  inCart?: number;
  className?: string;
  onOpen: (productId: string) => void;
  onAdd: (productId: string) => void;
}

const badgeTone = { new: 'cyan', hot: 'magenta', low_stock: 'amber' } as const;
const badgeKey = { new: 'badgeNew', hot: 'badgeHot', low_stock: 'badgeLow' } as const;

export function ProductCard({
  product,
  locale,
  layout = 'grid',
  inCart = 0,
  className = '',
  onOpen,
  onAdd
}: ProductCardProps) {
  const { t } = useTranslation();
  const { isFavorite, toggle } = useFavorites();

  const favorite = isFavorite(product.id);
  const favoriteLabel = favorite ? t('product.removeFavorite') : t('product.addFavorite');

  const heartClass =
  'flex items-center justify-center rounded-full border transition-[transform,color,background-color,border-color] duration-150 ease-pop active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ' + (
  favorite ?
  'border-neon-magenta/60 bg-neon-magenta/20 text-neon-magenta' :
  'border-ink-600 bg-ink-900/70 text-white/50 hover:text-white');

  if (layout === 'row') {
    return (
      <li className={['group relative', className].join(' ')}>
        <button
          type="button"
          onClick={() => onOpen(product.id)}
          className="flex w-full items-center gap-3 rounded-chunk border border-ink-600/70 bg-ink-800/70 p-3 pe-14 text-start transition-[transform,border-color,background-color] duration-150 ease-pop hover:border-accent/50 hover:bg-ink-700/70 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          
          <img
            src={product.image}
            alt=""
            className="h-16 w-16 shrink-0 rounded-2xl bg-ink-950 object-cover"
            loading="lazy" />
          
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-extrabold text-white">
              {localize(product.name, locale)}
            </span>
            <span className="mt-0.5 block truncate text-xs text-white/50">
              {localize(product.tagline, locale)}
            </span>
          </span>
          <span className="shrink-0 font-display text-sm text-accent">
            {formatPrice(product.price, locale)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggle(product.id)}
          aria-label={favoriteLabel}
          aria-pressed={favorite}
          className={[heartClass, 'absolute end-3 top-1/2 h-9 w-9 -translate-y-1/2'].join(' ')}>
          
          <HeartIcon className={['h-4 w-4', favorite ? 'fill-current' : ''].join(' ')} />
        </button>
      </li>);

  }

  return (
    <li className={['group flex', className].join(' ')}>
      <article className="flex w-full flex-col overflow-hidden rounded-chunk border border-ink-600/70 bg-ink-800/70 transition-[transform,border-color] duration-200 ease-pop hover:-translate-y-1 hover:border-accent/50">
        <div className="relative">
          <button
            type="button"
            onClick={() => onOpen(product.id)}
            className="relative block aspect-square w-full overflow-hidden bg-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            aria-label={localize(product.name, locale)}>
            
            <img
              src={product.image}
              alt={localize(product.name, locale)}
              className="h-full w-full object-cover transition-transform duration-300 ease-pop group-hover:scale-105"
              loading="lazy" />
            
            {product.badge &&
            <span className="absolute start-2 top-2">
                <NeonBadge tone={badgeTone[product.badge]}>
                  {t(`product.${badgeKey[product.badge]}`)}
                </NeonBadge>
              </span>
            }
          </button>
          <button
            type="button"
            onClick={() => toggle(product.id)}
            aria-label={favoriteLabel}
            aria-pressed={favorite}
            className={[heartClass, 'absolute end-2 top-2 h-9 w-9 backdrop-blur'].join(' ')}>
            
            <HeartIcon className={['h-4 w-4', favorite ? 'fill-current' : ''].join(' ')} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="line-clamp-1 text-sm font-extrabold text-white">
            {localize(product.name, locale)}
          </h3>
          <p className="line-clamp-1 text-[11px] text-white/45">{localize(product.tagline, locale)}</p>

          <div className="mt-1 flex items-center gap-1 text-[11px] text-white/55">
            <StarIcon className="h-3.5 w-3.5 fill-neon-amber text-neon-amber" />
            <span className="font-bold text-white/80">{product.rating}</span>
            <span className="text-white/35">,</span>
            <span>{product.reviewCount}</span>
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <div className="min-w-0">
              <p className="font-display text-base leading-none text-white">
                {formatPrice(product.price, locale)}
              </p>
              {product.compareAtPrice &&
              <p className="mt-1 text-[11px] text-white/35 line-through">
                  {formatPrice(product.compareAtPrice, locale)}
                </p>
              }
            </div>
            <button
              type="button"
              onClick={() => onAdd(product.id)}
              aria-label={`Add ${localize(product.name, 'en')} to cart`}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink-950 transition-transform duration-150 ease-pop active:translate-y-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={{ boxShadow: '0 4px 0 0 var(--accent-deep)' }}>
              
              <PlusIcon className="h-5 w-5" strokeWidth={3} />
              {inCart > 0 &&
              <span className="absolute -end-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-ink-800 bg-neon-magenta px-1 font-display text-[10px] text-white">
                  {inCart}
                </span>
              }
            </button>
          </div>
        </div>
      </article>
    </li>);

}