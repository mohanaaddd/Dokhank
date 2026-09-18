import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BriefcaseIcon, HomeIcon, MapPinIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { ChunkyButton } from '../ui/ChunkyButton';
import { useAddresses } from '../../contexts/AddressContext';
import { useLocale } from '../../contexts/LocaleContext';
import { localize } from '../../utils/format';
import type { AddressLabel } from '../../types';

const KIND_ICONS: Record<AddressLabel, typeof HomeIcon> = {
  home: HomeIcon,
  work: BriefcaseIcon,
  other: MapPinIcon
};

interface AddressListProps {
  onAddNew: () => void;
}

export function AddressList({ onAddNew }: AddressListProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { addresses, removeAddress } = useAddresses();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {addresses.length === 0 ?
        <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-blob border border-ink-600 bg-ink-800">
              <MapPinIcon className="h-7 w-7 text-white/40" />
            </span>
            <p className="font-display text-base text-white">{t('address.empty')}</p>
            <p className="max-w-[26ch] text-sm text-white/45">{t('address.emptyBody')}</p>
          </div> :

        <ul className="flex flex-col gap-3">
            {addresses.map((address) => {
            const Icon = KIND_ICONS[address.kind ?? 'other'];
            const confirming = confirmId === address.id;
            return (
              <li
                key={address.id}
                className="rounded-chunk border border-ink-600 bg-ink-800/50 p-3">
                
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink-700 text-white/60">
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-extrabold text-white">
                        {localize(address.label, locale)}
                      </p>
                      <p className="truncate text-xs text-white/45" dir="auto">
                        {localize(address.line, locale)}
                      </p>
                      <p className="mt-0.5 text-xs text-white/30">
                        {t('address.etaLabel', { count: address.etaMinutes })}
                      </p>
                    </div>
                    <button
                    type="button"
                    onClick={() => setConfirmId(confirming ? null : address.id)}
                    aria-label={t('address.remove')}
                    aria-expanded={confirming}
                    className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-150',
                    confirming ?
                    'border-neon-magenta text-neon-magenta' :
                    'border-ink-600 text-white/40 hover:border-neon-magenta/60 hover:text-neon-magenta'].
                    join(' ')}>
                    
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  </div>

                  {confirming &&
                <div className="mt-3 flex items-center gap-2 border-t border-ink-700 pt-3">
                      <p className="min-w-0 flex-1 text-xs font-bold text-white/60">
                        {t('address.removeTitle')}
                      </p>
                      <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="rounded-2xl border border-ink-600 px-3 py-1.5 text-xs font-bold text-white/60 transition-colors duration-150 hover:text-white">
                    
                        {t('common.cancel')}
                      </button>
                      <button
                    type="button"
                    onClick={() => {
                      removeAddress(address.id);
                      setConfirmId(null);
                    }}
                    className="rounded-2xl bg-neon-magenta px-3 py-1.5 text-xs font-extrabold text-ink-950">
                    
                        {t('address.removeConfirm')}
                      </button>
                    </div>
                }
                </li>);

          })}
          </ul>
        }
      </div>

      <div className="border-t border-ink-700 bg-ink-900/95 px-4 py-3">
        <ChunkyButton size="lg" fullWidth onClick={onAddNew}>
          <PlusIcon className="h-4 w-4" />
          {t('address.addNew')}
        </ChunkyButton>
      </div>
    </>);

}