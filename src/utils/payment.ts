import { BanknoteIcon, CreditCardIcon, SmartphoneIcon } from 'lucide-react';
import type { PaymentKind, PaymentMethod } from '../types';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Cash on delivery is the system method every account is bootstrapped with. */
export const CASH_KIND: PaymentKind = 'cash';

export const PAYMENT_ICONS: Record<PaymentKind, typeof BanknoteIcon> = {
  cash: BanknoteIcon,
  card: CreditCardIcon,
  instapay: SmartphoneIcon
};

export function paymentTitle(method: PaymentMethod, t: Translate): string {
  if (method.kind === 'card') return `${method.brand ?? 'Card'} •••• ${method.last4 ?? '0000'}`;
  return t(`payment.${method.kind}`);
}

export function paymentNote(method: PaymentMethod, t: Translate, fallbackPhone?: string): string {
  if (method.kind === 'card') return t('payment.cardNote', { expiry: method.expiry ?? '—' });
  if (method.kind === 'instapay')
  return t('payment.instapayNote', { phone: method.phone ?? fallbackPhone ?? '' });
  return t('payment.cashNote');
}