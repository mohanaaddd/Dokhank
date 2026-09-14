import React from 'react';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article' | 'li';
  tone?: 'default' | 'raised' | 'outline';
  children: React.ReactNode;
}

const tones: Record<NonNullable<PanelProps['tone']>, string> = {
  default: 'bg-ink-800/80 border border-ink-600/70',
  raised: 'bg-ink-700 border border-ink-500/70 shadow-[0_6px_0_0_rgba(5,4,15,0.85)]',
  outline: 'bg-transparent border border-ink-600/70'
};

export function Panel({ as = 'div', tone = 'default', className = '', children, ...rest }: PanelProps) {
  const Tag = as;
  return (
    <Tag {...rest} className={['rounded-chunk', tones[tone], className].join(' ')}>
      {children}
    </Tag>);

}