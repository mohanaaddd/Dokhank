import React from 'react';
import { useTranslation } from 'react-i18next';
import { BikeIcon, ChevronRightIcon, LogOutIcon, StoreIcon } from 'lucide-react';
import { ChunkyButton } from '../../components/ui/ChunkyButton';
import { Panel } from '../../components/ui/Panel';
import { Toggle } from '../../components/ui/Toggle';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useOps } from '../../contexts/OpsContext';

export function OwnerProfile() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const { user, signOut } = useAuth();
  const { navigate } = useNavigation();
  const { couriers, storeOpen, setStoreOpen } = useOps();

  const onShift = couriers.filter((courier) => courier.status !== 'offline').length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader kicker={t('owner.kicker')} title={t('owner.storeTitle')} />

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-blob bg-accent/20 font-display text-lg text-accent">
            {user?.initials ?? 'DK'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg text-white">{user?.name ?? '—'}</p>
            <p className="truncate text-xs text-white/45" dir="ltr">
              {user?.phone ?? ''}
            </p>
          </div>
        </div>

        <Panel
          tone="raised"
          className={[
          'mt-5 flex items-center gap-3 p-4 transition-colors duration-200 ease-pop',
          storeOpen ? 'ring-1 ring-accent/50' : ''].
          join(' ')}>
          
          <span
            className={[
            'flex h-11 w-11 items-center justify-center rounded-2xl',
            storeOpen ? 'bg-accent/20 text-accent' : 'bg-ink-800 text-white/40'].
            join(' ')}>
            
            <StoreIcon className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm text-white">
              {storeOpen ? t('owner.storeOpen') : t('owner.storeClosed')}
            </p>
            <p className="text-xs text-white/45">
              {storeOpen ? t('owner.storeOpenNote') : t('owner.storeClosedNote')}
            </p>
          </div>
          <Toggle
            checked={storeOpen}
            onChange={() => void setStoreOpen(!storeOpen)}
            label={t('owner.storeToggle')} />
          
        </Panel>

        <button
          type="button"
          onClick={() => navigate({ name: 'owner_couriers' })}
          className="mt-3 flex w-full items-center gap-3 rounded-chunk border border-ink-600 bg-ink-800/60 p-4 text-start transition-colors duration-150 ease-pop hover:border-ink-500">
          
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neon-cyan/15 text-neon-cyan">
            <BikeIcon className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-white">{t('owner.couriers')}</span>
            <span className="block text-xs text-white/45">
              {t('owner.couriersNote', { count: couriers.length, active: onShift })}
            </span>
          </span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-white/25 rtl:rotate-180" />
        </button>

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