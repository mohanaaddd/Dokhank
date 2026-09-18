import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { BikeIcon, PackageIcon, ReceiptTextIcon } from 'lucide-react';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { NeonBadge } from '../components/ui/NeonBadge';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { ReceiptSheet } from '../components/order/ReceiptSheet';
import { products } from '../data/products';
import { useCart } from '../contexts/CartContext';
import { useLocale } from '../contexts/LocaleContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useOrders } from '../contexts/OrderContext';
import { formatOrderDate, formatPrice, localize, orderCode } from '../utils/format';
import type { Order } from '../types';

function itemCount(order: Order): number {
  return order.lines.reduce((total, line) => total + line.quantity, 0);
}

export function Orders() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { back, navigate } = useNavigation();
  const { orders } = useOrders();
  const { add } = useCart();
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const receiptOrder = orders.find((order) => order.id === receiptId) ?? null;
  const active = orders.filter((order) => order.status !== 'delivered');
  const past = orders.filter((order) => order.status === 'delivered');

  const reorder = (order: Order) => {
    order.lines.forEach((line) => add(line.productId, line.quantity));
    navigate({ name: 'cart' });
  };

  const renderOrder = (order: Order) => {
    const isActive = order.status !== 'delivered';
    const thumbs = order.lines.
    map((line) => products.find((product) => product.id === line.productId)).
    filter(Boolean).
    slice(0, 3);

    return (
      <li
        key={order.id}
        className={[
        'rounded-chunk border p-4',
        isActive ? 'border-neon-cyan/40 bg-neon-cyan/[0.07]' : 'border-ink-600 bg-ink-800/50'].
        join(' ')}>
        
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink-700">
            {isActive ?
            <BikeIcon className="h-5 w-5 text-neon-cyan" /> :

            <PackageIcon className="h-5 w-5 text-white/45" />
            }
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[11px] tracking-[0.18em] text-white/45">
              {orderCode(order.id)}
            </p>
            <p className="mt-1 truncate text-[15px] font-extrabold text-white">
              {t(`tracking.${order.status}`)}
            </p>
            <p className="mt-0.5 text-xs text-white/40">
              {t('orders.placedOn', { date: formatOrderDate(order.placedAt, locale) })}
            </p>
          </div>
          {isActive && <NeonBadge tone="cyan">{t('orders.active')}</NeonBadge>}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex -space-x-3 rtl:space-x-reverse">
            {thumbs.map((product) =>
            <img
              key={product!.id}
              src={product!.image}
              alt={localize(product!.name, locale)}
              className="h-10 w-10 rounded-xl border-2 border-ink-800 object-cover" />

            )}
          </div>
          <span className="text-xs font-bold text-white/50">
            {t('orders.items', { count: itemCount(order) })}
          </span>
          <span className="ms-auto font-display text-base text-accent">
            {formatPrice(order.total, locale)}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          {isActive ?
          <ChunkyButton
            size="sm"
            className="flex-1"
            onClick={() => navigate({ name: 'tracking', orderId: order.id })}>
            
              {t('orders.track')}
            </ChunkyButton> :

          <ChunkyButton size="sm" variant="dark" className="flex-1" onClick={() => reorder(order)}>
              {t('orders.reorder')}
            </ChunkyButton>
          }
          <button
            type="button"
            onClick={() => setReceiptId(order.id)}
            className="flex items-center gap-1.5 rounded-2xl border border-ink-600 px-3 text-xs font-bold text-white/55 transition-colors duration-150 hover:border-ink-500 hover:text-white">
            
            <ReceiptTextIcon className="h-4 w-4" />
            {t('orders.viewReceipt')}
          </button>
        </div>
      </li>);

  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader onBack={back} kicker={t('orders.kicker')} title={t('orders.title')} />

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-24 pt-4">
        {orders.length === 0 ?
        <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-blob border border-ink-600 bg-ink-800">
              <PackageIcon className="h-7 w-7 text-white/40" />
            </span>
            <p className="font-display text-base text-white">{t('orders.empty')}</p>
            <p className="max-w-[26ch] text-sm text-white/45">{t('orders.emptyBody')}</p>
            <ChunkyButton size="sm" className="mt-2" onClick={() => navigate({ name: 'home' })}>
              {t('orders.emptyCta')}
            </ChunkyButton>
          </div> :

        <div className="flex flex-col gap-6">
            {active.length > 0 &&
          <section>
                <h2 className="mb-3 font-display text-[11px] tracking-[0.2em] text-white/45">
                  {t('orders.active')}
                </h2>
                <ul className="flex flex-col gap-3">{active.map(renderOrder)}</ul>
              </section>
          }

            {past.length > 0 &&
          <section>
                <h2 className="mb-3 font-display text-[11px] tracking-[0.2em] text-white/45">
                  {t('orders.past')}
                </h2>
                <ul className="flex flex-col gap-3">{past.map(renderOrder)}</ul>
              </section>
          }
          </div>
        }
      </div>

      <AnimatePresence>
        {receiptOrder &&
        <ReceiptSheet order={receiptOrder} onClose={() => setReceiptId(null)} />
        }
      </AnimatePresence>
    </div>);

}