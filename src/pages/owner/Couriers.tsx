import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { ChunkyButton } from '../../components/ui/ChunkyButton';
import { NeonBadge } from '../../components/ui/NeonBadge';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { useNavigation } from '../../contexts/NavigationContext';
import { useOps } from '../../contexts/OpsContext';
import { digitsOnly, formatEgyptianPhone } from '../../utils/format';

const SHIFT_TONE = {
  offline: 'muted',
  idle: 'lime',
  assigned: 'cyan',
  delivering: 'cyan'
} as const;

const inputClass =
'w-full rounded-2xl border border-ink-600 bg-ink-800/70 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-accent focus:outline-none';

export function Couriers() {
  const { t } = useTranslation();
  const { back } = useNavigation();
  const { couriers, saveCourier } = useOps();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || digitsOnly(phone).length !== 10) {
      setError(t('owner.courierInvalid'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveCourier({
        name: name.trim(),
        phone: `+20 ${formatEgyptianPhone(phone)}`,
        vehicle: vehicle.trim() || 'Scooter'
      });
      setName('');
      setPhone('');
      setVehicle('');
      setAdding(false);
    } catch {
      setError(t('owner.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader onBack={back} kicker={t('owner.kicker')} title={t('owner.couriers')} />

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <ul className="flex flex-col gap-2">
          {couriers.map((courier) =>
          <li
            key={courier.id}
            className="flex items-center gap-3 rounded-2xl border border-ink-600/70 bg-ink-800/50 p-3">
            
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neon-cyan/15 font-display text-xs text-neon-cyan">
                {courier.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-white">{courier.name}</p>
                <p className="truncate text-xs text-white/40" dir="ltr">
                  {courier.phone} · {courier.vehicle}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <NeonBadge tone={SHIFT_TONE[courier.status]}>
                  {t(`owner.shift_${courier.status}`)}
                </NeonBadge>
                {courier.linked &&
              <span className="flex items-center gap-1 text-[10px] font-bold text-white/30">
                    <CheckIcon className="h-3 w-3" />
                    {t('owner.linked')}
                  </span>
              }
              </div>
            </li>
          )}
        </ul>

        {couriers.length === 0 &&
        <p className="rounded-chunk border border-dashed border-ink-600 px-4 py-8 text-center text-sm text-white/40">
            {t('owner.noCouriers')}
          </p>
        }

        {adding ?
        <div className="mt-4 flex flex-col gap-3 rounded-chunk border border-ink-600 bg-ink-800/70 p-4">
            <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('owner.courierName')}
            aria-label={t('owner.courierName')}
            className={inputClass} />
          
            <input
            dir="ltr"
            inputMode="numeric"
            value={formatEgyptianPhone(phone)}
            onChange={(event) => setPhone(digitsOnly(event.target.value))}
            placeholder={t('auth.phonePlaceholder')}
            aria-label={t('owner.courierPhone')}
            className={inputClass} />
          
            <input
            value={vehicle}
            onChange={(event) => setVehicle(event.target.value)}
            placeholder={t('owner.courierVehicle')}
            aria-label={t('owner.courierVehicle')}
            className={inputClass} />
          
            <p className="text-[11px] leading-relaxed text-white/35">{t('owner.courierNote')}</p>
            {error &&
          <p className="text-xs font-bold text-neon-magenta">{error}</p>
          }
            <div className="flex gap-2">
              <ChunkyButton size="sm" variant="ghost" className="flex-1" onClick={() => setAdding(false)}>
                {t('common.cancel')}
              </ChunkyButton>
              <ChunkyButton size="sm" className="flex-1" loading={busy} onClick={() => void submit()}>
                {t('common.save')}
              </ChunkyButton>
            </div>
          </div> :

        <ChunkyButton variant="dark" fullWidth className="mt-4" onClick={() => setAdding(true)}>
            <PlusIcon className="h-4 w-4" />
            {t('owner.addCourier')}
          </ChunkyButton>
        }
      </div>
    </div>);

}