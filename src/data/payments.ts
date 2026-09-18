import { BanknoteIcon, CreditCardIcon, SmartphoneIcon } from 'lucide-react';
import type { PaymentKind, PaymentMethod } from '../types';

/** Mirrors a `payment_methods` row: cash is a system row and can't be deleted. */
export const paymentMethods: PaymentMethod[] = [
{ id: 'pay_cash', kind: 'cash', removable: false },
{ id: 'pay_visa', kind: 'card', brand: 'Visa', last4: '4242', expiry: '09/28', removable: true },
{ id: 'pay_instapay', kind: 'instapay', removable: true }];


export const DEFAULT_PAYMENT_ID = 'pay_cash';

export const PAYMENT_ICONS: Record<PaymentKind, typeof BanknoteIcon> = {
  cash: BanknoteIcon,
  card: CreditCardIcon,
  instapay: SmartphoneIcon
};