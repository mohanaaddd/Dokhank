import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  size?: 'sm' | 'lg';
  label: string;
  onChange: (value: number) => void;
  /** Renders a trash icon instead of minus when the next step removes the line. */
  removable?: boolean;
}

export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  size = 'lg',
  label,
  onChange,
  removable = false
}: QuantityStepperProps) {
  const large = size === 'lg';
  const atMin = value <= min;
  const showTrash = removable && atMin;

  const button =
  'flex items-center justify-center rounded-2xl border border-ink-500 bg-ink-700 text-white ' +
  'transition-[transform,background-color,color] duration-150 ease-pop active:scale-95 ' +
  'hover:bg-ink-600 disabled:opacity-35 disabled:hover:bg-ink-700 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ' + (
  large ? 'h-12 w-12' : 'h-9 w-9');

  return (
    <div
      className="inline-flex items-center gap-2"
      role="group"
      aria-label={label}>
      
      <button
        type="button"
        className={button}
        onClick={() => onChange(showTrash ? 0 : value - 1)}
        disabled={!removable && atMin}
        aria-label={showTrash ? 'Remove item' : 'Decrease quantity'}>
        
        {showTrash ?
        <Trash2Icon className={large ? 'h-5 w-5' : 'h-4 w-4'} /> :

        <MinusIcon className={large ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={3} />
        }
      </button>

      <div
        className={[
        'relative overflow-hidden text-center font-display tabular-nums text-white',
        large ? 'min-w-[3rem] text-xl' : 'min-w-[2rem] text-base'].
        join(' ')}
        aria-live="polite">
        
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="block">
            
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity">
        
        <PlusIcon className={large ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={3} />
      </button>
    </div>);

}