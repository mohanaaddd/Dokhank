import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from '../data/locales/en';
import { ar } from '../data/locales/ar';
import type { Locale } from '../types';

let initialized = false;

export function initI18n(locale: Locale = 'en') {
  if (initialized) return i18n;
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ar: { translation: ar }
    },
    lng: locale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false
  });
  initialized = true;
  return i18n;
}

export const isRtl = (locale: Locale) => locale === 'ar';

export default i18n;