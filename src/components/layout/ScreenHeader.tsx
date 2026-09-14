import React from 'react';
import { ChevronLeftIcon, ShoppingBagIcon } from 'lucide-react';

interface ScreenHeaderProps {
  title?: string;
  kicker?: string;
  onBack?: () => void;
  cartCount?: number;
  onCart?: () => void;
  action?: React.ReactNode;
  transparent?: boolean;
}

export function ScreenHeader({
  title,
  kicker,
  onBack,
  cartCount,
  onCart,
  action,
  transparent = false
}: ScreenHeaderProps) {
  return (
    <header
      className={[
      'sticky top-0 z-20 flex items-center gap-3 px-4 py-3',
      transparent ? 'bg-transparent' : 'border-b border-ink-700/80 bg-ink-900/90 backdrop-blur'].
      join(' ')}>
      
      {onBack &&
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-ink-600 bg-ink-800/90 text-white transition-[transform,background-color] duration-150 ease-pop hover:bg-ink-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        
          <ChevronLeftIcon className="h-5 w-5 rtl:rotate-180" strokeWidth={2.6} />
        </button>
      }

      <div className="min-w-0 flex-1">
        {kicker &&
        <p className="truncate font-display text-[10px] tracking-[0.22em] text-accent">{kicker}</p>
        }
        {title && <h1 className="truncate text-lg font-extrabold text-white">{title}</h1>}
      </div>

      {action}

      {onCart &&
      <button
        type="button"
        onClick={onCart}
        aria-label={`Cart, ${cartCount ?? 0} items`}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-ink-600 bg-ink-800/90 text-white transition-[transform,background-color] duration-150 ease-pop hover:bg-ink-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        
          <ShoppingBagIcon className="h-5 w-5" strokeWidth={2.2} />
          {!!cartCount &&
        <span className="absolute -end-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1 font-display text-[10px] text-ink-950">
              {cartCount}
            </span>
        }
        </button>
      }
    </header>);

}