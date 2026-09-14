import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon, StarIcon } from 'lucide-react';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { NeonBadge } from '../components/ui/NeonBadge';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { categories } from '../data/products';
import { useCart } from '../contexts/CartContext';
import { useLocale } from '../contexts/LocaleContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useProduct } from '../hooks/useCatalog';
import { formatPrice, localize } from '../utils/format';

const badgeTone = { new: 'cyan', hot: 'magenta', low_stock: 'amber' } as const;
const badgeKey = { new: 'badgeNew', hot: 'badgeHot', low_stock: 'badgeLow' } as const;

export function ProductDetail({ productId }: {productId: string;}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { back, navigate } = useNavigation();
  const { add, count, quantityOf, setQuantity } = useCart();
  const product = useProduct(productId);

  const [justAdded, setJustAdded] = useState(false);

  if (!product) {
    return (
      <div className="flex flex-1 flex-col">
        <ScreenHeader onBack={back} title={t('common.error')} />
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/50">
          {t('common.error')}
        </div>
      </div>);

  }

  const soldOut = product.stock === 0;
  const alreadyIn = quantityOf(product.id);

  const handleAdd = () => {
    add(product.id, 1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader
        onBack={back}
        kicker={localize(
          categories.find((entry) => entry.id === product.category)?.label ?? { en: '', ar: '' },
          locale
        )}
        title={localize(product.name, locale)}
        cartCount={count}
        onCart={() => navigate({ name: 'cart' })} />
      

      <div className="no-scrollbar flex-1 overflow-y-auto pb-6">
        <div className="relative aspect-square w-full bg-ink-950">
          <img
            src={product.image}
            alt={localize(product.name, locale)}
            className="h-full w-full object-cover" />
          
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-900 to-transparent" />
          {product.badge &&
          <span className="absolute start-4 top-4">
              <NeonBadge tone={badgeTone[product.badge]}>
                {t(`product.${badgeKey[product.badge]}`)}
              </NeonBadge>
            </span>
          }
        </div>

        <div className="px-4 pt-1">
          <h2 className="font-display text-2xl leading-tight text-white">
            {localize(product.name, locale)}
          </h2>
          <p className="mt-1.5 text-[15px] text-white/55">{localize(product.tagline, locale)}</p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm">
              <StarIcon className="h-4 w-4 fill-neon-amber text-neon-amber" />
              <span className="font-extrabold text-white">{product.rating}</span>
              <span className="text-white/40">{t('product.reviews', { count: product.reviewCount })}</span>
            </span>
            <span
              className={[
              'font-display text-[10px] tracking-[0.16em]',
              product.stock <= 10 ? 'text-neon-amber' : 'text-white/40'].
              join(' ')}>
              
              {soldOut ?
              t('product.outOfStock') :
              product.stock <= 10 ?
              t('product.lowStock', { count: product.stock }) :
              t('product.inStock', { count: product.stock })}
            </span>
          </div>

          <p className="mt-5 font-display text-4xl leading-none text-accent">
            {formatPrice(product.price, locale)}
          </p>

          <section className="mt-6">
            <h3 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
              {t('product.about')}
            </h3>
            <p className="text-[15px] leading-relaxed text-white/65">
              {localize(product.description, locale)}
            </p>
          </section>

          <section className="mt-6">
            <h3 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
              {t('product.specs')}
            </h3>
            <dl className="divide-y divide-ink-700 overflow-hidden rounded-chunk border border-ink-600">
              {product.specs.map((spec) =>
              <div key={spec.label.en} className="flex items-center justify-between px-4 py-3">
                  <dt className="text-sm text-white/50">{localize(spec.label, locale)}</dt>
                  <dd className="text-sm font-extrabold text-white">{localize(spec.value, locale)}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>

      <div className="relative border-t border-ink-700 bg-ink-900/95 px-4 py-3">
        <AnimatePresence>
          {justAdded &&
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute -top-12 start-4 end-4 flex items-center gap-2 rounded-2xl border border-accent/40 bg-ink-800 px-4 py-2.5"
            role="status">
            
              <CheckIcon className="h-4 w-4 text-accent" strokeWidth={3} />
              <span className="text-sm font-bold text-white">{t('product.added')}</span>
            </motion.div>
          }
        </AnimatePresence>

        {alreadyIn > 0 ?
        <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-chunk border border-ink-600 bg-ink-800/70 px-2 py-1.5">
              <QuantityStepper
              value={alreadyIn}
              min={1}
              max={Math.max(1, product.stock)}
              size="sm"
              removable
              label={t('product.quantity')}
              onChange={(next) => setQuantity(product.id, next)} />
            
            </div>
            <ChunkyButton className="flex-1" onClick={() => navigate({ name: 'cart' })}>
              {t('product.viewCart')}
            </ChunkyButton>
          </div> :

        <ChunkyButton size="lg" fullWidth onClick={handleAdd} disabled={soldOut}>
            {soldOut ?
          t('product.outOfStock') :
          t('product.addToCart', { price: formatPrice(product.price, locale) })}
          </ChunkyButton>
        }
      </div>
    </div>);

}