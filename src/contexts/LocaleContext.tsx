import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { isLive } from '../lib/supabaseConfig';
import { readPrefs, writePrefs, type NotificationPrefs } from '../lib/prefs';
import i18n, { initI18n, isRtl } from '../utils/i18n';
import type { AccentName, Locale } from '../types';

export type { AccentName };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: 'ltr' | 'rtl';
  accent: AccentName;
  setAccent: (accent: AccentName) => void;
  notifications: NotificationPrefs;
  setNotifications: (patch: Partial<NotificationPrefs>) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  initialLocale?: Locale;
  initialAccent?: AccentName;
  children: React.ReactNode;
}

/**
 * Language, neon accent and notification toggles live in localStorage so they
 * survive refresh and sign-out. When a session exists they are also written to
 * `profiles` / `notification_prefs`.
 */
export function LocaleProvider({ initialLocale, initialAccent, children }: LocaleProviderProps) {
  const stored = useMemo(() => readPrefs(), []);
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? stored.locale);
  const [accent, setAccentState] = useState<AccentName>(initialAccent ?? stored.accent);
  const [notifications, setNotificationsState] = useState<NotificationPrefs>(stored.notifications);
  const userId = useRef<string | null>(null);

  useMemo(() => initI18n(initialLocale ?? stored.locale), [initialLocale, stored.locale]);

  useEffect(() => {
    if (initialLocale) setLocaleState(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    if (initialAccent) setAccentState(initialAccent);
  }, [initialAccent]);

  useEffect(() => {
    if (i18n.language !== locale) i18n.changeLanguage(locale);
  }, [locale]);

  const hydrate = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      userId.current = null;
      return;
    }
    userId.current = auth.user.id;
    const [{ data: profile }, { data: prefs }] = await Promise.all([
      supabase.from('profiles').select('locale,accent').eq('id', auth.user.id).maybeSingle(),
      supabase.from('notification_prefs').select('orders,offers,restock').eq('user_id', auth.user.id).maybeSingle()
    ]);
    const row = profile as {locale?: Locale;accent?: AccentName;} | null;
    if (row?.locale) setLocaleState(row.locale);
    if (row?.accent) setAccentState(row.accent);
    if (prefs) {
      const next = {
        orders: Boolean((prefs as NotificationPrefs).orders),
        offers: Boolean((prefs as NotificationPrefs).offers),
        restock: Boolean((prefs as NotificationPrefs).restock)
      };
      setNotificationsState(next);
      writePrefs({
        ...(row?.locale ? { locale: row.locale } : {}),
        ...(row?.accent ? { accent: row.accent } : {}),
        notifications: next
      });
    } else if (row?.locale || row?.accent) {
      writePrefs({
        ...(row?.locale ? { locale: row.locale } : {}),
        ...(row?.accent ? { accent: row.accent } : {})
      });
    }
  }, []);

  useEffect(() => {
    if (!isLive) return;
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

  const persistProfile = useCallback((patch: {locale?: Locale;accent?: AccentName;}) => {
    writePrefs(patch);
    if (!isLive || !userId.current) return;
    void supabase.from('profiles').update(patch).eq('id', userId.current);
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      persistProfile({ locale: next });
    },
    [persistProfile]
  );

  const setAccent = useCallback(
    (next: AccentName) => {
      setAccentState(next);
      persistProfile({ accent: next });
    },
    [persistProfile]
  );

  const setNotifications = useCallback((patch: Partial<NotificationPrefs>) => {
    setNotificationsState((prev) => {
      const next = { ...prev, ...patch };
      writePrefs({ notifications: next });
      if (isLive && userId.current) {
        void supabase.from('notification_prefs').update(patch).eq('user_id', userId.current);
      }
      return next;
    });
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      dir: isRtl(locale) ? 'rtl' : 'ltr',
      accent,
      setAccent,
      notifications,
      setNotifications
    }),
    [locale, accent, notifications, setLocale, setAccent, setNotifications]
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
