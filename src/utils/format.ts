import type { Locale, Localized } from '../types';

export function formatPrice(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(value);
}

export function localize(field: Localized, locale: Locale): string {
  return field[locale] ?? field.en;
}

export function orderCode(id: string): string {
  return `#${id.slice(-5).toUpperCase()}`;
}

export function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

/** Egyptian mobile numbers are 10 national digits: 1X XXXX XXXX. */
export const EG_PHONE_LENGTH = 10;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatEgyptianPhone(digits: string): string {
  const clean = digitsOnly(digits).slice(0, EG_PHONE_LENGTH);
  const parts = [clean.slice(0, 2), clean.slice(2, 6), clean.slice(6, 10)].filter(Boolean);
  return parts.join(' ');
}

export function isValidEgyptianPhone(digits: string): boolean {
  return /^1[0125]\d{8}$/.test(digitsOnly(digits));
}

export function fullEgyptianPhone(digits: string): string {
  return `+20 ${formatEgyptianPhone(digits)}`;
}

export function formatOrderDate(timestamp: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}