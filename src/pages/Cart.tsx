import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBagIcon } from 'lucide-react';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { OrderSummary } from '../components/cart/OrderSummary';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useCart } from '../contexts/CartContext';
import { useLocale } from '../contexts/LocaleContext';
import { useNavigation } from '../contexts/NavigationContext';
import { formatPrice, localize } from '../utils/format';

export function Cart() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { back, navigate, goToTab } = useNavigation();
  const { lines, resolve, setQuantity, subtotal, deliveryFee, total, count } = useCart();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader
        onBack={back}
        title={t('cart.title')}
        kicker={count > 0 ? t('cart.items', { count }) : undefined} />
      

      {lines.length === 0 ?
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-blob border border-ink-600 bg-ink-800">
            <ShoppingBagIcon className="h-9 w-9 text-white/35" />
          </span>
          <h2 className="mt-6 font-display text-xl text-white">{t('cart.empty')}</h2>
          <p className="mt-2 text-sm text-white/45">{t('cart.emptyBody')}</p>
          <ChunkyButton className="mt-7" onClick={() => goToTab('home')}>
            {t('cart.emptyCta')}
          </ChunkyButton>
        </div> :

      <>
          <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
            <ul className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {lines.map((line) => {
                const product = resolve(line);
                if (!product) return null;
                return (
                  <motion.li
                    key={line.productId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="flex items-center gap-3 rounded-chunk border border-ink-600/70 bg-ink-800/70 p-3">
                    
                      <button
                      type="button"
                      onClick={() => navigate({ name: 'product', productId: product.id })}
                      className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      aria-label={localize(product.name, locale)}>
                      
                        <img
                        src={product.image}
                        alt=""
                        className="h-16 w-16 rounded-2xl bg-ink-950 object-cover" />
                      
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-extrabold text-white">
                          {localize(product.name, locale)}
                        </p>
                        <p className="mt-0.5 font-display text-sm text-accent">
                          {formatPrice(product.price * line.quantity, locale)}
                        </p>
                      </div>

                      <QuantityStepper
                      size="sm"
                      removable
                      value={line.quantity}
                      max={product.stock}
                      label={`${localize(product.name, 'en')} ${t('product.quantity')}`}
                      onChange={(value) => setQuantity(product.id, value)} />
                    
                    </motion.li>);

              })}
              </AnimatePresence>
            </ul>

            <div className="mt-6 rounded-chunk border border-ink-600 bg-ink-800/60 p-4">
              <OrderSummary
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              total={total}
              locale={locale} />
            
            </div>
          </div>

          <div className="border-t border-ink-700 bg-ink-900/95 px-4 py-3">
            <ChunkyButton size="lg" fullWidth onClick={() => navigate({ name: 'location' })}>
              {t('cart.checkout')}
            </ChunkyButton>
          </div>
        </>
      }
    </div>);

}