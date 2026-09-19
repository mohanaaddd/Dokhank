import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { supabase } from '../lib/supabase';
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

/**
 * Language and accent are per-member settings stored on `profiles`, so they
 * survive sign-out / sign-in. This provider sits above AuthProvider, so it
 * reads the session straight off the Supabase client instead of through a hook.
 */
export function LocaleProvider({ initialLocale, initialAccent, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [accent, setAccentState] = useState<AccentName>(initialAccent);
  const userId = useRef<string | null>(null);

  useMemo(() => initI18n(initialLocale), [initialLocale]);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    setAccentState(initialAccent);
  }, [initialAccent]);

  useEffect(() => {
    if (i18n.language !== locale) i18n.changeLanguage(locale);
  }, [locale]);

  /** Hydrate the saved preferences whenever a session appears. */
  const hydrate = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      userId.current = null;
      return;
    }
    userId.current = auth.user.id;
    const { data } = await supabase.
    from('profiles').
    select('locale,accent').
    eq('id', auth.user.id).
    maybeSingle();
    const row = data as {locale?: Locale;accent?: AccentName;} | null;
    if (!row) return;
    if (row.locale) setLocaleState(row.locale);
    if (row.accent) setAccentState(row.accent);
  }, []);

  useEffect(() => {
    void hydrate();
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        userId.current = null;
        return;
      }
      if (event === 'SIGNED_IN') void hydrate();
    });
    return () => subscription.subscription.unsubscribe();
  }, [hydrate]);

  const persist = useCallback((patch: {locale?: Locale;accent?: AccentName;}) => {
    if (!userId.current) return;
    void supabase.from('profiles').update(patch).eq('id', userId.current);
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      persist({ locale: next });
    },
    [persist]
  );

  const setAccent = useCallback(
    (next: AccentName) => {
      setAccentState(next);
      persist({ accent: next });
    },
    [persist]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      dir: isRtl(locale) ? 'rtl' : 'ltr',
      accent,
      setAccent
    }),
    [locale, accent, setLocale, setAccent]
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