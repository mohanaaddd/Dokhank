import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
}

/**
 * Track is 48px wide with a 1px border, so the knob sits at a matching 3px
 * inset on both ends and never kisses the border when switched on.
 */
export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={[
      'relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200 ease-pop',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
      checked ? 'border-accent bg-accent/25' : 'border-ink-600 bg-ink-700'].
      join(' ')}>
      
      <span
        className={[
        'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-[left] duration-200 ease-pop',
        checked ? 'left-[23px] bg-accent' : 'left-[3px] bg-white/50'].
        join(' ')} />
      
    </button>);

}