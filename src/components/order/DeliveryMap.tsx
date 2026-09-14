import React from 'react';

interface Marker {
  x: number;
  y: number;
  tone?: 'accent' | 'cyan' | 'magenta';
  pulse?: boolean;
  label?: string;
}

interface DeliveryMapProps {
  markers: Marker[];
  onPick?: (point: {x: number;y: number;}) => void;
  className?: string;
  height?: string;
}

const toneColor = {
  accent: 'var(--accent)',
  cyan: '#22E4F5',
  magenta: '#FF3DCB'
} as const;

export function DeliveryMap({ markers, onPick, className = '', height = 'h-56' }: DeliveryMapProps) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onPick) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onPick({
      x: Math.min(0.96, Math.max(0.04, (event.clientX - rect.left) / rect.width)),
      y: Math.min(0.94, Math.max(0.06, (event.clientY - rect.top) / rect.height))
    });
  };

  return (
    <div
      onClick={handleClick}
      role={onPick ? 'button' : 'img'}
      tabIndex={onPick ? 0 : undefined}
      aria-label="Delivery map"
      className={[
      'relative w-full overflow-hidden rounded-chunk border border-ink-600 bg-ink-950',
      onPick ? 'cursor-crosshair' : '',
      height,
      className].
      join(' ')}>
      
      <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id="map-grid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M25 0H0V25" fill="none" stroke="rgba(155,107,255,0.18)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="240" fill="url(#map-grid)" />
        <path d="M0 150 L150 150 L150 40 L400 40" fill="none" stroke="rgba(34,228,245,0.35)" strokeWidth="4" />
        <path d="M60 240 L60 110 L260 110 L260 240" fill="none" stroke="rgba(184,255,60,0.22)" strokeWidth="4" />
        <path d="M0 205 L400 205" fill="none" stroke="rgba(255,61,203,0.22)" strokeWidth="4" />
        <rect x="180" y="150" width="70" height="44" rx="6" fill="rgba(255,255,255,0.04)" />
        <rect x="290" y="70" width="80" height="56" rx="6" fill="rgba(255,255,255,0.04)" />
        <rect x="20" y="40" width="90" height="50" rx="6" fill="rgba(255,255,255,0.04)" />
      </svg>

      {markers.map((marker, index) =>
      <div
        key={`${marker.x}-${marker.y}-${index}`}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}>
        
          {marker.pulse &&
        <span
          className="absolute inset-0 -m-2 animate-pulse-ring rounded-full"
          style={{ backgroundColor: toneColor[marker.tone ?? 'accent'], opacity: 0.35 }} />

        }
          <span
          className="relative block h-4 w-4 rounded-full border-2 border-ink-950"
          style={{
            backgroundColor: toneColor[marker.tone ?? 'accent'],
            boxShadow: `0 0 16px ${toneColor[marker.tone ?? 'accent']}`
          }} />
        
          {marker.label &&
        <span className="absolute start-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-950/90 px-2 py-0.5 font-display text-[9px] tracking-widest text-white">
              {marker.label}
            </span>
        }
        </div>
      )}
    </div>);

}