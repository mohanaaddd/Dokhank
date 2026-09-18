import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { LockIcon } from 'lucide-react';
import { useLocale, type AccentName } from '../../contexts/LocaleContext';
import { useOrders } from '../../contexts/OrderContext';

/** Green ships unlocked; the rest are earned with delivered orders. */
const accents: Array<{id: AccentName;color: string;requires: number;}> = [
{ id: 'lime', color: '#B8FF3C', requires: 0 },
{ id: 'cyan', color: '#22E4F5', requires: 10 },
{ id: 'magenta', color: '#FF3DCB', requires: 50 },
{ id: 'amber', color: '#FFC93C', requires: 100 }];


export function AccentPicker() {
  const { t } = useTranslation();
  const { accent, setAccent } = useLocale();
  const { deliveredCount } = useOrders();
  const [lockedAccent, setLockedAccent] = useState<AccentName | null>(null);

  const lockedRequirement = accents.find((entry) => entry.id === lockedAccent)?.requires ?? 0;

  return (
    <section className="mt-6 text-center">
      <h2 className="mb-3 font-display text-[11px] tracking-[0.2em] text-white/45">
        {t('profile.accent')}
      </h2>
      <div className="flex justify-center gap-4">
        {accents.map((entry) => {
          const locked = deliveredCount < entry.requires;
          const isActive = accent === entry.id;
          return (
            <div key={entry.id} className="flex w-12 flex-col items-center gap-1.5">
              <button
                type="button"
                aria-label={entry.id}
                aria-pressed={isActive}
                aria-disabled={locked}
                onClick={() => {
                  if (locked) {
                    setLockedAccent(entry.id);
                    return;
                  }
                  setAccent(entry.id);
                  setLockedAccent(null);
                }}
                className={[
                'flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-transform duration-150 ease-pop active:scale-90',
                locked ? 'border-white/10' : isActive ? 'border-white' : 'border-transparent'].
                join(' ')}
                style={{
                  backgroundColor: locked ? `${entry.color}22` : entry.color,
                  boxShadow: locked ? 'none' : `0 0 18px -4px ${entry.color}`
                }}>
                
                {locked && <LockIcon className="h-4 w-4 text-white/50" aria-hidden />}
              </button>
              <span className="font-display text-[8px] leading-none tracking-[0.1em] text-white/35">
                {locked ? t('profile.accentUnlocksAt', { count: entry.requires }) : '\u00A0'}
              </span>
            </div>);

        })}
      </div>
      <p className="mt-3 text-xs text-white/35">{t('profile.accentNote')}</p>

      <AnimatePresence initial={false}>
        {lockedAccent &&
        <motion.p
          key={lockedAccent}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          role="status"
          className="mt-2 rounded-chunk border border-neon-magenta/40 bg-neon-magenta/10 px-3 py-2 text-xs font-bold text-neon-magenta">
          
            {t('profile.accentLockedNote', { count: lockedRequirement, have: deliveredCount })}
          </motion.p>
        }
      </AnimatePresence>
    </section>);

}