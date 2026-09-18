import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CrosshairIcon, MapPinIcon, PlusIcon } from 'lucide-react';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { DeliveryMap } from '../components/order/DeliveryMap';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useAddresses } from '../contexts/AddressContext';
import { useCart } from '../contexts/CartContext';
import { useLocale } from '../contexts/LocaleContext';
import { useNavigation } from '../contexts/NavigationContext';
import { localize } from '../utils/format';
import type { DeliveryAddress } from '../types';

export function Location() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { back, navigate } = useNavigation();
  const { addresses: saved } = useAddresses();
  const { address, setAddress } = useCart();

  const [selected, setSelected] = useState<DeliveryAddress>(address ?? saved[0]);
  const [note, setNote] = useState(address?.note ?? '');
  const [locating, setLocating] = useState(false);

  const pickPoint = (point: {x: number;y: number;}) => {
    setSelected({
      id: 'pin',
      label: { en: 'Pinned location', ar: 'الموقع المحدد' },
      line: {
        en: `Lat ${(30 + point.y).toFixed(3)}, Lng ${(31 + point.x).toFixed(3)}`,
        ar: `خط العرض ${(30 + point.y).toFixed(3)}، خط الطول ${(31 + point.x).toFixed(3)}`
      },
      x: point.x,
      y: point.y,
      etaMinutes: Math.round(16 + point.y * 22)
    });
  };

  const useCurrent = () => {
    setLocating(true);
    window.setTimeout(() => {
      pickPoint({ x: 0.47, y: 0.55 });
      setLocating(false);
    }, 900);
  };

  const confirm = () => {
    setAddress({ ...selected, note: note.trim() || undefined });
    navigate({ name: 'checkout' });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader onBack={back} title={t('location.title')} kicker={t('cart.checkout')} />

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
        <p className="text-sm text-white/50">{t('location.subtitle')}</p>

        <div className="mt-4">
          <DeliveryMap
            height="h-52"
            onPick={pickPoint}
            markers={[{ x: selected.x, y: selected.y, tone: 'accent', pulse: true }]} />
          
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-white/40">{t('location.dropPin')}</p>
            <button
              type="button"
              onClick={useCurrent}
              className="flex items-center gap-1.5 text-xs font-bold text-accent transition-opacity duration-150 hover:opacity-80">
              
              <CrosshairIcon className={locating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {locating ? t('location.locating') : t('location.useCurrent')}
            </button>
          </div>
        </div>

        <h2 className="mb-2 mt-6 font-display text-[11px] tracking-[0.2em] text-white/45">
          {t('location.saved')}
        </h2>
        <ul className="flex flex-col gap-2">
          {saved.map((entry) => {
            const isActive = selected.id === entry.id;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setSelected(entry)}
                  aria-pressed={isActive}
                  className={[
                  'flex w-full items-center gap-3 rounded-chunk border p-3 text-start transition-[transform,border-color,background-color] duration-150 ease-pop active:scale-[0.99]',
                  isActive ?
                  'border-accent bg-accent/10' :
                  'border-ink-600 bg-ink-800/60 hover:border-ink-500'].
                  join(' ')}>
                  
                  <span
                    className={[
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                    isActive ? 'bg-accent text-ink-950' : 'bg-ink-700 text-white/50'].
                    join(' ')}>
                    
                    <MapPinIcon className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-extrabold text-white">
                      {localize(entry.label, locale)}
                    </span>
                    <span className="block truncate text-xs text-white/45">
                      {localize(entry.line, locale)}
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-[10px] tracking-widest text-white/45">
                    {t('location.eta', { count: entry.etaMinutes })}
                  </span>
                </button>
              </li>);

          })}
        </ul>

        <button
          type="button"
          onClick={() => navigate({ name: 'address', intent: 'new' })}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-chunk border border-dashed border-ink-600 py-3 text-sm font-bold text-white/55 transition-colors duration-150 hover:border-accent/50 hover:text-accent">
          
          <PlusIcon className="h-4 w-4" />
          {t('location.addNew')}
        </button>

        {selected.id === 'pin' &&
        <div className="mt-2 rounded-chunk border border-accent bg-accent/10 p-3">
            <p className="font-display text-[10px] tracking-[0.18em] text-accent">
              {t('location.pinned')}
            </p>
            <p className="mt-1 text-sm font-bold text-white">{localize(selected.line, locale)}</p>
            <p className="mt-0.5 text-xs text-white/45">
              {t('location.eta', { count: selected.etaMinutes })}
            </p>
          </div>
        }

        <label htmlFor="courier-note" className="mt-6 block text-xs font-bold uppercase tracking-[0.14em] text-white/45">
          {t('location.noteLabel')}
        </label>
        <textarea
          id="courier-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder={t('location.notePlaceholder')}
          className="mt-2 w-full resize-none rounded-chunk border border-ink-600 bg-ink-800 p-3 text-[15px] text-white placeholder:text-white/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40" />
        
      </div>

      <div className="border-t border-ink-700 bg-ink-900/95 px-4 py-3">
        <ChunkyButton size="lg" fullWidth onClick={confirm}>
          {t('location.confirm')}
        </ChunkyButton>
      </div>
    </div>);

}