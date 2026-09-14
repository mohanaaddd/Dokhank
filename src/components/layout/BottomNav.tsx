import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { HomeIcon, SearchIcon, UserIcon } from 'lucide-react';
import type { TabName } from '../../types';

const tabs: Array<{id: TabName;icon: typeof HomeIcon;}> = [
{ id: 'home', icon: HomeIcon },
{ id: 'search', icon: SearchIcon },
{ id: 'profile', icon: UserIcon }];


interface BottomNavProps {
  active: TabName | null;
  onSelect: (tab: TabName) => void;
}

export function BottomNav({ active, onSelect }: BottomNavProps) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('nav.home') + ' / ' + t('nav.search') + ' / ' + t('nav.profile')}
      className="relative z-20 border-t border-ink-600/80 bg-ink-900/95 px-3 pb-3 pt-2 backdrop-blur">
      
      <ul className="flex items-stretch justify-between gap-2">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className="group relative flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                
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
                  'relative font-display text-[10px] tracking-[0.12em] transition-colors duration-150 ease-pop',
                  isActive ? 'text-accent' : 'text-white/45 group-hover:text-white/70'].
                  join(' ')}>
                  
                  {t(`nav.${tab.id}`)}
                </span>
              </button>
            </li>);

        })}
      </ul>
    </nav>);

}