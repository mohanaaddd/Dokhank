import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '../../utils/format';
import type { Locale } from '../../types';

interface OrderSummaryProps {
  subtotal: number;
  deliveryFee: number;
  total: number;
  locale: Locale;
}

export function OrderSummary({ subtotal, deliveryFee, total, locale }: OrderSummaryProps) {
  const { t } = useTranslation();

  return (
    <dl className="flex flex-col gap-2.5 text-[15px]">
      <div className="flex items-center justify-between">
        <dt className="text-white/55">{t('cart.subtotal')}</dt>
        <dd className="font-bold text-white">{formatPrice(subtotal, locale)}</dd>
      </div>
      <div className="flex items-center justify-between">
        <dt className="text-white/55">{t('cart.delivery')}</dt>
        <dd className={deliveryFee === 0 ? 'font-display text-xs text-accent' : 'font-bold text-white'}>
          {deliveryFee === 0 ? t('common.free') : formatPrice(deliveryFee, locale)}
        </dd>
      </div>
      <div className="mt-1 flex items-baseline justify-between border-t border-ink-600 pt-3">
        <dt className="font-display text-xs tracking-[0.18em] text-white/60">{t('cart.total')}</dt>
        <dd className="font-display text-2xl text-accent">{formatPrice(total, locale)}</dd>
      </div>
    </dl>);

}