import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { OrderSummary } from '../cart/OrderSummary';
import { products } from '../../data/products';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { usePayments } from '../../contexts/PaymentContext';
import { formatOrderDate, formatPrice, localize, orderCode } from '../../utils/format';
import { paymentTitle } from '../../utils/payment';
import type { Order } from '../../types';

interface ReceiptSheetProps {
  order: Order;
  onClose: () => void;
}

export function ReceiptSheet({ order, onClose }: ReceiptSheetProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { getMethod, methods } = usePayments();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const method = getMethod(order.paymentMethodId) ?? methods[0];

  const rows = [
  { label: t('orders.receiptDate'), value: formatOrderDate(order.placedAt, locale) },
  { label: t('orders.receiptStatus'), value: t(`tracking.${order.status}`) },
  { label: t('orders.receiptPayment'), value: method ? paymentTitle(method, t) : '—' },
  { label: t('orders.receiptAddress'), value: localize(order.address.line, locale) }];


  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <motion.button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="absolute inset-0 bg-ink-950/80" />
      

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
        className="relative flex max-h-[88%] w-full max-w-md flex-col overflow-hidden rounded-t-chunk border border-ink-600 bg-ink-900">
        
        <header className="flex items-start gap-3 border-b border-ink-700 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[10px] tracking-[0.2em] text-accent">
              {t('orders.receiptKicker', { id: orderCode(order.id) })}
            </p>
            <h2 className="mt-1 font-display text-xl text-white">{t('orders.receiptTitle')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-ink-600 text-white/60 transition-colors duration-150 hover:border-ink-500 hover:text-white">
            
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">
          <dl className="flex flex-col gap-2">
            {rows.map((row) =>
            <div key={row.label} className="flex items-baseline gap-3 text-sm">
                <dt className="shrink-0 text-white/40">{row.label}</dt>
                <dd className="ms-auto min-w-0 truncate text-end font-bold text-white" dir="auto">
                  {row.value}
                </dd>
              </div>
            )}
          </dl>

          <h3 className="mb-2 mt-5 font-display text-[11px] tracking-[0.2em] text-white/45">
            {t('orders.receiptItems')}
          </h3>
          <ul className="flex flex-col gap-2.5 border-b border-ink-700 pb-4">
            {order.lines.map((line) => {
              const product = products.find((entry) => entry.id === line.productId);
              return (
                <li key={line.productId} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-ink-700 px-1 font-display text-[10px] text-white/70">
                    {line.quantity}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-white/70">
                    {product ? localize(product.name, locale) : line.productId}
                  </span>
                  <span className="font-bold text-white">
                    {formatPrice((product?.price ?? 0) * line.quantity, locale)}
                  </span>
                </li>);

            })}
          </ul>

          <div className="pt-4">
            <OrderSummary
              subtotal={order.subtotal}
              deliveryFee={order.deliveryFee}
              total={order.total}
              locale={locale} />
            
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-white/30">
            {t('orders.receiptFooter')}
            {user?.phone ? ` · ${user.phone}` : ''}
          </p>
        </div>
      </motion.div>
    </div>);

}