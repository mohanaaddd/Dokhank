import type { AccentName, Locale } from '../types';

export interface NotificationPrefs {
  orders: boolean;
  offers: boolean;
  restock: boolean;
}

export interface AppPrefs {
  locale: Locale;
  accent: AccentName;
  notifications: NotificationPrefs;
}

export const PREFS_KEY = 'dokhan.prefs.v1';

const ACCENTS: AccentName[] = ['lime', 'cyan', 'magenta', 'amber'];

export const defaultPrefs = (): AppPrefs => ({
  locale: 'ar',
  accent: 'lime',
  notifications: { orders: true, offers: true, restock: false }
});

function isLocale(value: unknown): value is Locale {
  return value === 'ar' || value === 'en';
}

function isAccent(value: unknown): value is AccentName {
  return typeof value === 'string' && ACCENTS.includes(value as AccentName);
}

export function readPrefs(): AppPrefs {
  const fallback = defaultPrefs();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AppPrefs>;
    return {
      locale: isLocale(parsed.locale) ? parsed.locale : fallback.locale,
      accent: isAccent(parsed.accent) ? parsed.accent : fallback.accent,
      notifications: {
        orders: parsed.notifications?.orders ?? fallback.notifications.orders,
        offers: parsed.notifications?.offers ?? fallback.notifications.offers,
        restock: parsed.notifications?.restock ?? fallback.notifications.restock
      }
    };
  } catch {
    return fallback;
  }
}

export function writePrefs(patch: Partial<AppPrefs>): AppPrefs {
  const next: AppPrefs = { ...readPrefs(), ...patch };
  if (patch.notifications) {
    next.notifications = { ...readPrefs().notifications, ...patch.notifications };
  }
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  return next;
}

export function isValidPersonName(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 40) return false;
  return /^[\p{L}][\p{L}\s'.-]*$/u.test(trimmed);
}
