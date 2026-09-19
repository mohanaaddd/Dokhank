import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BriefcaseIcon, CrosshairIcon, HomeIcon, MapPinIcon } from 'lucide-react';
import { ChunkyButton } from '../ui/ChunkyButton';
import { DeliveryMap } from '../order/DeliveryMap';
import { useAddresses } from '../../contexts/AddressContext';
import type { AddressLabel, DeliveryAddress } from '../../types';
import { digitsOnly, EG_PHONE_LENGTH, formatEgyptianPhone, isValidEgyptianPhone } from '../../utils/format';

const labelOptions: Array<{id: AddressLabel;Icon: typeof HomeIcon;}> = [
{ id: 'home', Icon: HomeIcon },
{ id: 'work', Icon: BriefcaseIcon },
{ id: 'other', Icon: MapPinIcon }];


/** Cairo-ish coordinates so the mock pin reads as a real place. */
const toLatLng = (point: {x: number;y: number;}) => ({
  lat: (30.09 - point.y * 0.12).toFixed(4),
  lng: (31.19 + point.x * 0.14).toFixed(4)
});

interface AddressFormProps {
  onSaved: () => void;
}

export function AddressForm({ onSaved }: AddressFormProps) {
  const { t } = useTranslation();
  const { saveAddress } = useAddresses();

  const [point, setPoint] = useState({ x: 0.48, y: 0.46 });
  const [locating, setLocating] = useState(false);
  const [kind, setKind] = useState<AddressLabel>('home');
  const [street, setStreet] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [landmark, setLandmark] = useState('');
  const [directions, setDirections] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{street?: string;building?: string;phone?: string;}>({});

  const coords = toLatLng(point);

  const useCurrent = () => {
    setLocating(true);
    window.setTimeout(() => {
      setPoint({ x: 0.42, y: 0.52 });
      setLocating(false);
    }, 900);
  };

  const save = () => {
    const nextErrors: {street?: string;building?: string;phone?: string;} = {};
    if (!street.trim()) nextErrors.street = t('address.streetError');
    if (!building.trim()) nextErrors.building = t('address.buildingError');
    if (!isValidEgyptianPhone(phone)) nextErrors.phone = t('address.phoneError');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const line = [building.trim(), street.trim(), landmark.trim()].filter(Boolean).join(', ');
    const address: DeliveryAddress = {
      id: `addr_${Date.now().toString(36)}`,
      label: { en: t('address.' + kind), ar: t('address.' + kind) },
      line: { en: line, ar: line },
      x: point.x,
      y: point.y,
      etaMinutes: Math.round(16 + point.y * 22),
      kind,
      building: building.trim(),
      floor: floor.trim() || undefined,
      apartment: apartment.trim() || undefined,
      landmark: landmark.trim() || undefined,
      note: directions.trim() || undefined
      ,phone: `+20 ${formatEgyptianPhone(phone)}`
    };
    saveAddress(address);
    onSaved();
  };

  const field =
  'mt-2 h-12 w-full rounded-chunk border border-ink-600 bg-ink-800 px-4 text-[15px] font-semibold text-white placeholder:font-normal placeholder:text-white/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40';
  const labelClass = 'block text-xs font-bold uppercase tracking-[0.14em] text-white/45';

  return (
    <>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <DeliveryMap
          height="h-60"
          onPick={setPoint}
          markers={[{ x: point.x, y: point.y, tone: 'accent', pulse: true }]} />
        
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-white/40">{t('address.mapHint')}</p>
          <button
            type="button"
            onClick={useCurrent}
            className="flex items-center gap-1.5 text-xs font-bold text-accent transition-opacity duration-150 hover:opacity-80">
            
            <CrosshairIcon className={locating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {locating ? t('address.locating') : t('address.useCurrent')}
          </button>
        </div>

        <p className="mt-3 rounded-chunk border border-accent/40 bg-accent/10 px-4 py-2.5 text-center text-xs font-bold text-accent">
          {t('address.coordinates', { lat: coords.lat, lng: coords.lng })}
        </p>

        <h2 className="mb-2 mt-6 font-display text-[11px] tracking-[0.2em] text-white/45">
          {t('address.labelTitle')}
        </h2>
        <div className="flex gap-2">
          {labelOptions.map(({ id, Icon }) => {
            const isActive = kind === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setKind(id)}
                aria-pressed={isActive}
                className={[
                'flex flex-1 items-center justify-center gap-2 rounded-chunk border py-3 text-[14px] font-extrabold',
                'transition-[transform,border-color,background-color,color] duration-150 ease-pop active:scale-[0.98]',
                isActive ?
                'border-accent bg-accent text-ink-950' :
                'border-ink-600 bg-ink-800/60 text-white/60 hover:text-white'].
                join(' ')}>
                
                <Icon className="h-4 w-4" strokeWidth={2.6} />
                {t(`address.${id}`)}
              </button>);

          })}
        </div>

        <h2 className="mb-3 mt-6 font-display text-[11px] tracking-[0.2em] text-white/45">
          {t('address.details')}
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="street" className={labelClass}>
              {t('address.streetLabel')}
            </label>
            <input
              id="street"
              value={street}
              onChange={(event) => setStreet(event.target.value)}
              placeholder={t('address.streetPlaceholder')}
              className={field} />
            
            {errors.street &&
            <p className="mt-1.5 text-xs font-bold text-neon-magenta">{errors.street}</p>
            }
          </div>

          <div>
            <label htmlFor="address-phone" className={labelClass}>{t('address.phoneLabel')}</label>
            <div dir="ltr" className="mt-2 flex h-12 overflow-hidden rounded-chunk border border-ink-600 bg-ink-800 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/40">
              <span className="flex items-center border-e border-ink-600 bg-ink-700/70 px-3 text-sm text-white">🇪🇬 +20</span>
              <input id="address-phone" type="tel" inputMode="numeric" value={formatEgyptianPhone(phone)}
                onChange={(event) => setPhone(digitsOnly(event.target.value).slice(0, EG_PHONE_LENGTH))}
                placeholder="10 1234 5678" className="min-w-0 flex-1 bg-transparent px-3 font-bold text-white placeholder:text-white/25 focus:outline-none" />
            </div>
            {errors.phone && <p className="mt-1.5 text-xs font-bold text-neon-magenta">{errors.phone}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="building" className={labelClass}>
                {t('address.buildingLabel')}
              </label>
              <input
                id="building"
                value={building}
                onChange={(event) => setBuilding(event.target.value)}
                placeholder={t('address.buildingPlaceholder')}
                className={field} />
              
            </div>
            <div>
              <label htmlFor="floor" className={labelClass}>
                {t('address.floorLabel')}
              </label>
              <input
                id="floor"
                inputMode="numeric"
                value={floor}
                onChange={(event) => setFloor(event.target.value)}
                placeholder={t('address.floorPlaceholder')}
                className={field} />
              
            </div>
            <div>
              <label htmlFor="apartment" className={labelClass}>
                {t('address.apartmentLabel')}
              </label>
              <input
                id="apartment"
                value={apartment}
                onChange={(event) => setApartment(event.target.value)}
                placeholder={t('address.apartmentPlaceholder')}
                className={field} />
              
            </div>
          </div>
          {errors.building &&
          <p className="-mt-2 text-xs font-bold text-neon-magenta">{errors.building}</p>
          }

          <div>
            <label htmlFor="landmark" className={labelClass}>
              {t('address.landmarkLabel')}
            </label>
            <input
              id="landmark"
              value={landmark}
              onChange={(event) => setLandmark(event.target.value)}
              placeholder={t('address.landmarkPlaceholder')}
              className={field} />
            
          </div>

          <div>
            <label htmlFor="directions" className={labelClass}>
              {t('address.directionsLabel')}
            </label>
            <textarea
              id="directions"
              rows={3}
              value={directions}
              onChange={(event) => setDirections(event.target.value)}
              placeholder={t('address.directionsPlaceholder')}
              className="mt-2 w-full resize-none rounded-chunk border border-ink-600 bg-ink-800 p-3 text-[15px] text-white placeholder:text-white/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40" />
            
          </div>
        </div>
      </div>

      <div className="border-t border-ink-700 bg-ink-900/95 px-4 py-3">
        <ChunkyButton size="lg" fullWidth onClick={save}>
          {t('address.save')}
        </ChunkyButton>
      </div>
    </>);

}