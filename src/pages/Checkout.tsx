import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoIcon, MapPinIcon } from 'lucide-react';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { OrderSummary } from '../components/cart/OrderSummary';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { PAYMENT_ICONS } from '../data/payments';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLocale } from '../contexts/LocaleContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useOrders } from '../contexts/OrderContext';
import { usePayments } from '../contexts/PaymentContext';
import { formatPrice, localize } from '../utils/format';
import { paymentNote, paymentTitle } from '../utils/payment';

export function Checkout() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { back, navigate, replace } = useNavigation();
  const { lines, resolve, subtotal, deliveryFee, total, address, clear } = useCart();
  const { placeOrder, status } = useOrders();
  const { methods, defaultId } = usePayments();
  const [method, setMethod] = useState<string>(defaultId);

  /** The default method is always the one preselected when checkout opens. */
  useEffect(() => setMethod(defaultId), [defaultId]);

  const placing = status === 'loading';

  const submit = async () => {
    if (!address) return;
    const order = await placeOrder({
      lines,
      subtotal,
      deliveryFee,
      address,
      paymentMethodId: method
    });
    clear();
    replace({ name: 'tracking', orderId: order.id });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader onBack={back} title={t('checkout.title')} kicker={t('common.appName')} />

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
        <section>
          <h2 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
            {t('checkout.deliverTo')}
          </h2>
          <div className="flex items-center gap-3 rounded-chunk border border-ink-600 bg-ink-800/70 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink-950">
              <MapPinIcon className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold text-white">
                {address ? localize(address.label, locale) : '—'}
              </p>
              <p className="truncate text-xs text-white/45">
                {address ? localize(address.line, locale) : ''}
              </p>
              {address?.note &&
              <p className="mt-0.5 truncate text-xs text-white/35">“{address.note}”</p>
              }
            </div>
            <button
              type="button"
              onClick={() => navigate({ name: 'location' })}
              className="shrink-0 text-xs font-bold text-accent underline-offset-4 hover:underline">
              
              {t('checkout.change')}
            </button>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
            {t('checkout.payment')}
          </h2>
          <ul className="flex flex-col gap-2">
            {methods.map((entry) => {
              const isActive = method === entry.id;
              const Icon = PAYMENT_ICONS[entry.kind];
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setMethod(entry.id)}
                    aria-pressed={isActive}
                    className={[
                    'flex w-full items-center gap-3 rounded-chunk border p-3 text-start transition-[transform,border-color,background-color] duration-150 ease-pop active:scale-[0.99]',
                    isActive ?
                    'border-accent bg-accent/10' :
                    'border-ink-600 bg-ink-800/60 hover:border-ink-500'].
                    join(' ')}>
                    
                    <span
                      className={[
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                      isActive ? 'bg-accent text-ink-950' : 'bg-ink-700 text-white/50'].
                      join(' ')}>
                      
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-extrabold text-white">
                          {paymentTitle(entry, t)}
                        </span>
                        {entry.id === defaultId &&
                        <span className="shrink-0 rounded-full border border-accent/50 px-1.5 py-0.5 font-display text-[8px] tracking-[0.14em] text-accent">
                            {t('payment.default')}
                          </span>
                        }
                      </span>
                      <span className="block truncate text-xs text-white/45" dir="auto">
                        {paymentNote(entry, t, user?.phone)}
                      </span>
                    </span>
                    <span
                      className={[
                      'h-5 w-5 shrink-0 rounded-full border-2',
                      isActive ? 'border-accent bg-accent' : 'border-ink-500'].
                      join(' ')}
                      aria-hidden />
                    
                  </button>
                </li>);

            })}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
            {t('checkout.summary')}
          </h2>
          <div className="rounded-chunk border border-ink-600 bg-ink-800/60 p-4">
            <ul className="mb-4 flex flex-col gap-2.5 border-b border-ink-700 pb-4">
              {lines.map((line) => {
                const product = resolve(line);
                if (!product) return null;
                return (
                  <li key={line.productId} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-ink-700 px-1 font-display text-[10px] text-white/70">
                      {line.quantity}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-white/70">
                      {localize(product.name, locale)}
                    </span>
                    <span className="font-bold text-white">
                      {formatPrice(product.price * line.quantity, locale)}
                    </span>
                  </li>);

              })}
            </ul>
            <OrderSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} locale={locale} />
          </div>
        </section>

        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-white/35">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {t('checkout.ageNotice')}
        </p>
      </div>

      <div className="border-t border-ink-700 bg-ink-900/95 px-4 py-3">
        <ChunkyButton size="lg" fullWidth loading={placing} disabled={!address || lines.length === 0} onClick={submit}>
          {placing ? t('checkout.placing') : t('checkout.placeOrder', { price: formatPrice(total, locale) })}
        </ChunkyButton>
      </div>
    </div>);

}