import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BarChart3Icon,
  BikeIcon,
  HomeIcon,
  ListOrderedIcon,
  PackageIcon,
  SearchIcon,
  UserIcon } from
'lucide-react';
import type { TabName } from '../../types';

/** Every tab any of the three shells can show. The graph decides which appear. */
const TAB_META: Partial<Record<TabName, {icon: typeof HomeIcon;labelKey: string;}>> = {
  home: { icon: HomeIcon, labelKey: 'nav.home' },
  search: { icon: SearchIcon, labelKey: 'nav.search' },
  profile: { icon: UserIcon, labelKey: 'nav.profile' },
  courier_queue: { icon: ListOrderedIcon, labelKey: 'nav.queue' },
  courier_active: { icon: BikeIcon, labelKey: 'nav.active' },
  courier_profile: { icon: UserIcon, labelKey: 'nav.profile' },
  owner_orders: { icon: ListOrderedIcon, labelKey: 'nav.board' },
  owner_catalog: { icon: PackageIcon, labelKey: 'nav.catalog' },
  owner_insights: { icon: BarChart3Icon, labelKey: 'nav.insights' },
  owner_profile: { icon: UserIcon, labelKey: 'nav.store' }
};

interface BottomNavProps {
  tabs: TabName[];
  active: TabName | null;
  onSelect: (tab: TabName) => void;
}

export function BottomNav({ tabs, active, onSelect }: BottomNavProps) {
  const { t } = useTranslation();
  const entries = tabs.map((id) => ({ id, ...(TAB_META[id] ?? { icon: HomeIcon, labelKey: id }) }));

  return (
    <nav
      aria-label={t('nav.sections')}
      className="relative z-20 border-t border-ink-600/80 bg-ink-900/95 px-3 pb-3 pt-2 backdrop-blur">
      
      <ul className="flex items-stretch justify-between gap-1.5">
        {entries.map((tab) => {
          const isActive = active === tab.id;
          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className="group relative flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                
                {isActive &&
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-2xl bg-accent/12 ring-1 ring-accent/40"
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }} />

                }
                <tab.icon
                  className={[
                  'relative h-[22px] w-[22px] transition-colors duration-150 ease-pop',
                  isActive ? 'text-accent' : 'text-white/45 group-hover:text-white/75'].
                  join(' ')}
                  strokeWidth={isActive ? 2.6 : 2} />
                
                <span
                  className={[
                  'relative whitespace-nowrap font-display text-[9px] tracking-[0.1em] transition-colors duration-150 ease-pop',
                  isActive ? 'text-accent' : 'text-white/45 group-hover:text-white/70'].
                  join(' ')}>
                  
                  {t(tab.labelKey)}
                </span>
              </button>
            </li>);

        })}
      </ul>
    </nav>);

}