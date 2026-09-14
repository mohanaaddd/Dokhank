import type { DeliveryAddress } from '../types';

/** Seeded saved addresses — Cairo landmarks so the map reads as Egypt. */
export const addresses: DeliveryAddress[] = [
{
  id: 'home',
  label: { en: 'Home', ar: 'المنزل' },
  line: { en: '14 Brazil St, Zamalek, Cairo', ar: '١٤ شارع البرازيل، الزمالك، القاهرة' },
  x: 0.36,
  y: 0.42,
  etaMinutes: 22,
  kind: 'home',
  building: '14',
  floor: '3',
  apartment: '9'
},
{
  id: 'work',
  label: { en: 'Work', ar: 'العمل' },
  line: { en: 'Nile Tower, Floor 12, Maadi', ar: 'برج النيل، الطابق ١٢، المعادي' },
  x: 0.68,
  y: 0.3,
  etaMinutes: 31,
  kind: 'work',
  building: 'Nile Tower',
  floor: '12'
},
{
  id: 'family',
  label: { en: 'Family', ar: 'العيلة' },
  line: { en: '3 Makram Ebeid, Nasr City', ar: '٣ مكرم عبيد، مدينة نصر' },
  x: 0.52,
  y: 0.68,
  etaMinutes: 18,
  kind: 'other',
  building: '3',
  floor: '1'
}];