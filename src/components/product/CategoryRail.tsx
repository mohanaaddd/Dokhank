import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BoxIcon,
  CigaretteIcon,
  CpuIcon,
  FlameIcon,
  HeartIcon,
  LandmarkIcon,
  LayersIcon,
  ZapIcon } from
'lucide-react';
import { categories } from '../../data/products';
import { localize } from '../../utils/format';
import type { CategoryId, Locale } from '../../types';

const icons: Record<string, typeof ZapIcon> = {
  Zap: ZapIcon,
  Cpu: CpuIcon,
  Box: BoxIcon,
  Cigarette: CigaretteIcon,
  Flame: FlameIcon,
  Landmark: LandmarkIcon
};

export type FilterId = CategoryId | 'all' | 'favorites';

interface CategoryRailProps {
  value: FilterId;
  locale: Locale;
  /** Shown only once the shopper has favourited at least one product. */
  showFavorites?: boolean;
  onChange: (value: FilterId) => void;
}

export function CategoryRail({ value, locale, showFavorites = false, onChange }: CategoryRailProps) {
  const { t } = useTranslation();

  const entries: Array<{id: FilterId;label: string;Icon: typeof ZapIcon;}> = [
  { id: 'all', label: t('home.all'), Icon: LayersIcon },
  ...(showFavorites ?
  [{ id: 'favorites' as const, label: t('home.favorites'), Icon: HeartIcon }] :
  []),
  ...categories.map((category) => ({
    id: category.id,
    label: localize(category.label, locale),
    Icon: icons[category.icon] ?? ZapIcon
  }))];


  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {entries.map((entry) => {
        const isActive = entry.id === value;
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onChange(entry.id)}
            aria-pressed={isActive}
            className={[
            'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl border px-3.5 py-2 text-[13px] font-extrabold',
            'transition-[transform,background-color,border-color,color] duration-150 ease-pop active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            isActive ?
            'border-accent bg-accent text-ink-950' :
            'border-ink-600 bg-ink-800/70 text-white/65 hover:border-ink-500 hover:text-white'].
            join(' ')}>
            
            <entry.Icon className="h-4 w-4 shrink-0" strokeWidth={2.6} />
            {entry.label}
          </button>);

      })}
    </div>);

}