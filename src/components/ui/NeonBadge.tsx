import React from 'react';

type Tone = 'lime' | 'cyan' | 'magenta' | 'amber' | 'muted';

interface NeonBadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}

const tones: Record<Tone, string> = {
  lime: 'bg-neon-lime/15 text-neon-lime border-neon-lime/40',
  cyan: 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40',
  magenta: 'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/40',
  amber: 'bg-neon-amber/15 text-neon-amber border-neon-amber/40',
  muted: 'bg-white/5 text-white/60 border-white/15'
};

export function NeonBadge({ tone = 'lime', children, className = '' }: NeonBadgeProps) {
  return (
    <span
      className={[
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-display text-[10px] leading-5 tracking-[0.12em]',
      tones[tone],
      className].
      join(' ')}>
      
      {children}
    </span>);

}