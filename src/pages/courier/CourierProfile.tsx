import React from 'react';
import { useTranslation } from 'react-i18next';
import { LogOutIcon, StarIcon } from 'lucide-react';
import { ChunkyButton } from '../../components/ui/ChunkyButton';
import { Panel } from '../../components/ui/Panel';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useCourier } from '../../contexts/CourierContext';
import { useLocale } from '../../contexts/LocaleContext';
import { formatNumber, formatPrice } from '../../utils/format';

const isToday = (timestamp: number) => {
  const now = new Date();
  const then = new Date(timestamp);
  return (
    now.getFullYear() === then.getFullYear() &&
    now.getMonth() === then.getMonth() &&
    now.getDate() === then.getDate());

};

export function CourierProfile() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const { signOut } = useAuth();
  const { courier, history } = useCourier();

  const today = history.filter((order) => isToday(order.placedAt));
  const cash = today.
  filter((order) => order.paymentKind === 'cash').
  reduce((total, order) => total + order.total, 0);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader kicker={t('courier.kicker')} title={t('profile.title')} />

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-blob bg-accent/20 font-display text-lg text-accent">
            {courier?.initials ?? 'DK'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg text-white">{courier?.name ?? '—'}</p>
            <p className="truncate text-xs text-white/45">{courier?.vehicle ?? ''}</p>
          </div>
          <span className="flex items-center gap-1 rounded-2xl border border-ink-600 px-2.5 py-1.5 text-xs font-extrabold text-neon-amber">
            <StarIcon className="h-3.5 w-3.5 fill-current" />
            {courier ? courier.rating.toFixed(1) : '—'}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Panel tone="raised" className="p-4">
            <p className="font-display text-[10px] tracking-[0.18em] text-white/45">
              {t('courier.deliveredToday')}
            </p>
            <p className="mt-1 font-display text-2xl text-accent">
              {formatNumber(today.length, locale)}
            </p>
          </Panel>
          <Panel tone="raised" className="p-4">
            <p className="font-display text-[10px] tracking-[0.18em] text-white/45">
              {t('courier.cashToday')}
            </p>
            <p className="mt-1 font-display text-2xl text-white">{formatPrice(cash, locale)}</p>
          </Panel>
        </div>

        <h2 className="mb-2 mt-6 font-display text-[11px] tracking-[0.2em] text-white/45">
          {t('profile.language')}
        </h2>
        <div className="flex gap-2">
          {(['ar', 'en'] as const).map((code) =>
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={locale === code}
            className={[
            'flex-1 rounded-2xl border px-3 py-2.5 text-sm font-extrabold transition-colors duration-150 ease-pop',
            locale === code ?
            'border-accent bg-accent text-ink-950' :
            'border-ink-600 bg-ink-800/70 text-white/65 hover:text-white'].
            join(' ')}>
            
              {code === 'ar' ? 'العربية' : 'English'}
            </button>
          )}
        </div>

        <ChunkyButton variant="dark" fullWidth className="mt-8" onClick={signOut}>
          <LogOutIcon className="h-4 w-4 rtl:rotate-180" />
          {t('profile.signOut')}
        </ChunkyButton>
      </div>
    </div>);

}