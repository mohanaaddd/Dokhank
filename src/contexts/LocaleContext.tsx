import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n, isRtl } from '../utils/i18n';
import type { Locale } from '../types';

export type AccentName = 'lime' | 'cyan' | 'magenta' | 'amber';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: 'ltr' | 'rtl';
  accent: AccentName;
  setAccent: (accent: AccentName) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  initialLocale: Locale;
  initialAccent: AccentName;
  children: React.ReactNode;
}

export function LocaleProvider({ initialLocale, initialAccent, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [accent, setAccent] = useState<AccentName>(initialAccent);

  useMemo(() => initI18n(initialLocale), [initialLocale]);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    setAccent(initialAccent);
  }, [initialAccent]);

  useEffect(() => {
    if (i18n.language !== locale) i18n.changeLanguage(locale);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      dir: isRtl(locale) ? 'rtl' : 'ltr',
      accent,
      setAccent
    }),
    [locale, accent]
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    </I18nextProvider>);

}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}