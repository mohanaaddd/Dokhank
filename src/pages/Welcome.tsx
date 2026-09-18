import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BanknoteIcon, BikeIcon, ShieldCheckIcon } from 'lucide-react';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { NeonBadge } from '../components/ui/NeonBadge';
import { useLocale } from '../contexts/LocaleContext';
import { useNavigation } from '../contexts/NavigationContext';
import type { Locale } from '../types';

const LANGUAGES: Array<{id: Locale;label: string;}> = [
{ id: 'en', label: 'English' },
{ id: 'ar', label: 'مصري' }];


const HERO = "/2423e913-3666-48a0-9c90-f213c8bf7ba0.jpg";

export function Welcome() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const { navigate } = useNavigation();

  const points = [
  { key: 'pointOne', Icon: BikeIcon },
  { key: 'pointTwo', Icon: BanknoteIcon },
  { key: 'pointThree', Icon: ShieldCheckIcon }] as
  const;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[52%]">
        <img src={HERO} alt="" aria-hidden className="h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-ink-950/45" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-900 to-transparent" />
      </div>

      <div
        role="group"
        aria-label={t('welcome.languageLabel')}
        className="absolute end-5 top-5 z-10 flex items-center gap-1 rounded-full border border-white/15 bg-ink-950/75 p-1 backdrop-blur-sm">
        
        {LANGUAGES.map((entry) =>
        <button
          key={entry.id}
          type="button"
          onClick={() => setLocale(entry.id)}
          aria-pressed={locale === entry.id}
          className={[
          'rounded-full px-3 py-1.5 text-[12px] font-extrabold transition-colors duration-150 ease-pop',
          locale === entry.id ?
          'bg-accent text-ink-950' :
          'text-white/60 hover:text-white'].
          join(' ')}>
          
            {entry.label}
          </button>
        )}
      </div>

      <div className="relative flex flex-1 flex-col justify-end px-6 pb-8 pt-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
          
          <p className="font-display text-[11px] tracking-[0.32em] text-accent">
            {t('common.appName')}
          </p>
          <div className="mt-3">
            <NeonBadge tone="magenta">{t('welcome.kicker')}</NeonBadge>
          </div>

          <h1 className="mt-5 max-w-[12ch] font-display text-[42px] leading-[0.95] text-white">
            {t('welcome.title')}
          </h1>
          <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-white/60">
            {t('welcome.body')}
          </p>

          <ul className="mt-7 flex flex-col gap-3">
            {points.map(({ key, Icon }) =>
            <li key={key} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-ink-600 bg-ink-800">
                  <Icon className="h-4 w-4 text-accent" strokeWidth={2.4} />
                </span>
                <span className="text-[14px] font-semibold text-white/75">{t(`welcome.${key}`)}</span>
              </li>
            )}
          </ul>

          <div className="mt-9">
            <ChunkyButton size="lg" fullWidth onClick={() => navigate({ name: 'auth' })}>
              {t('welcome.start')}
            </ChunkyButton>
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-white/35">
            {t('welcome.legal')}
          </p>
        </motion.div>
      </div>
    </div>);

}