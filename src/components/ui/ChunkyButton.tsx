import React from 'react';

type Variant = 'primary' | 'cyan' | 'magenta' | 'dark' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ChunkyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const palettes: Record<Variant, {bg: string;shelf: string;text: string;border?: string;}> = {
  primary: { bg: 'var(--accent)', shelf: 'var(--accent-deep)', text: '#07060F' },
  cyan: { bg: '#22E4F5', shelf: '#0C8B97', text: '#04222A' },
  magenta: { bg: '#FF3DCB', shelf: '#A1157C', text: '#24001A' },
  dark: { bg: '#191334', shelf: '#0A0819', text: '#F4F1FF', border: '1px solid #332764' },
  ghost: { bg: 'transparent', shelf: 'transparent', text: '#BDB4E6', border: '1px solid #332764' }
};

const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-[13px]',
  md: 'h-12 px-5 text-[15px]',
  lg: 'h-14 px-6 text-base'
};

export function ChunkyButton({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  disabled,
  children,
  className = '',
  ...rest
}: ChunkyButtonProps) {
  const palette = palettes[variant];
  const flat = variant === 'ghost';
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={[
      'relative inline-flex items-center justify-center gap-2 rounded-chunk font-extrabold uppercase tracking-[0.08em]',
      'transition-[transform,box-shadow,background-color,opacity] duration-150 ease-pop',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950',
      isDisabled ? 'cursor-not-allowed opacity-45' : 'active:translate-y-[4px]',
      fullWidth ? 'w-full' : '',
      sizes[size],
      className].
      join(' ')}
      style={{
        backgroundColor: palette.bg,
        color: palette.text,
        border: palette.border,
        boxShadow: flat || isDisabled ? 'none' : `0 5px 0 0 ${palette.shelf}`
      }}
      onMouseDown={(event) => {
        if (!flat && !isDisabled) {
          event.currentTarget.style.boxShadow = `0 1px 0 0 ${palette.shelf}`;
        }
        rest.onMouseDown?.(event);
      }}
      onMouseUp={(event) => {
        if (!flat && !isDisabled) {
          event.currentTarget.style.boxShadow = `0 5px 0 0 ${palette.shelf}`;
        }
        rest.onMouseUp?.(event);
      }}
      onMouseLeave={(event) => {
        if (!flat && !isDisabled) {
          event.currentTarget.style.boxShadow = `0 5px 0 0 ${palette.shelf}`;
        }
        rest.onMouseLeave?.(event);
      }}>
      
      {loading &&
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />

      }
      {children}
    </button>);

}