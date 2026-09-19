import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { BottomNav } from './BottomNav';
import { BrandRail } from './BrandRail';

/**
 * Each role keeps its own accent so the chrome itself says which app you are
 * looking at. Only customers get to pick — ops colours are fixed.
 */
const ROLE_ACCENT = { courier: 'cyan', owner: 'magenta' } as const;

export function AppShell({ children }: {children: React.ReactNode;}) {
  const { dir, accent, locale } = useLocale();
  const { user } = useAuth();
  const { tabs, activeTab, goToTab, showNav } = useNavigation();

  const role = user?.role ?? 'customer';
  const shellAccent = role === 'customer' ? accent : ROLE_ACCENT[role];

  return (
    <div
      dir={dir}
      data-accent={shellAccent}
      className="relative h-screen w-full overflow-hidden bg-ink-950 font-sans text-white">
      
      <div className="retro-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 start-1/4 h-[520px] w-[520px] rounded-full opacity-30 blur-[140px]"
        style={{ backgroundColor: 'var(--accent)' }}
        aria-hidden />
      
      <div
        className="pointer-events-none absolute bottom-[-160px] end-[10%] h-[420px] w-[420px] rounded-full bg-neon-violet opacity-25 blur-[150px]"
        aria-hidden />
      

      <div className="relative flex h-full w-full items-stretch justify-center lg:items-center lg:gap-16 lg:p-10">
        <BrandRail locale={locale} />

        <div className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-ink-900 lg:h-[860px] lg:max-h-[90vh] lg:rounded-[2.75rem] lg:border-[6px] lg:border-ink-700 lg:shadow-[0_50px_120px_-40px_rgba(155,107,255,0.55)]">
          <div className="scanlines relative flex flex-1 flex-col overflow-hidden">
            {children}
            {showNav && <BottomNav tabs={tabs} active={activeTab} onSelect={goToTab} />}
          </div>
        </div>
      </div>
    </div>);

}