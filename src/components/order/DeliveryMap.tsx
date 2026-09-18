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

/** Street lattice for the stylised night-city tracker board. */
const STREETS_X = [18, 46, 74, 102, 130, 158, 186, 214, 242, 270, 298, 326, 354, 382];
const STREETS_Y = [16, 40, 64, 88, 112, 136, 160, 184, 208, 232];

const BLOCKS = [
{ x: 20, y: 18, w: 82, h: 44 },
{ x: 214, y: 18, w: 110, h: 44 },
{ x: 216, y: 114, w: 82, h: 68 },
{ x: 22, y: 138, w: 80, h: 70 },
{ x: 300, y: 160, w: 76, h: 48 }];


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
      'relative w-full overflow-hidden rounded-chunk border-2 border-[#1E5A72] bg-[#0A1433]',
      onPick ? 'cursor-crosshair' : '',
      height,
      className].
      join(' ')}>
      
      <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect width="400" height="240" fill="#0A1433" />

        {BLOCKS.map((block) =>
        <rect
          key={`${block.x}-${block.y}`}
          x={block.x}
          y={block.y}
          width={block.w}
          height={block.h}
          fill="rgba(126,214,226,0.05)" />

        )}

        {/* The river, cut through the grid */}
        <path
          d="M138 -8 C150 52 118 104 148 150 L166 248 L204 248 L182 150 C156 106 188 54 172 -8 Z"
          fill="#061024" />
        
        <path
          d="M138 -8 C150 52 118 104 148 150 L166 248"
          fill="none"
          stroke="rgba(126,214,226,0.28)"
          strokeWidth="1" />
        

        {STREETS_X.map((x) =>
        <line key={`vx-${x}`} x1={x} y1="0" x2={x} y2="240" stroke="rgba(126,214,226,0.13)" strokeWidth="1" />
        )}
        {STREETS_Y.map((y) =>
        <line key={`hy-${y}`} x1="0" y1={y} x2="400" y2={y} stroke="rgba(126,214,226,0.13)" strokeWidth="1" />
        )}

        {/* Arterials + ring road */}
        <path d="M0 64 H400" fill="none" stroke="rgba(126,214,226,0.34)" strokeWidth="2.5" />
        <path d="M0 184 H400" fill="none" stroke="rgba(126,214,226,0.26)" strokeWidth="2" />
        <path d="M242 0 V240" fill="none" stroke="rgba(126,214,226,0.3)" strokeWidth="2.5" />
        <path
          d="M30 24 H370 V214 H30 Z"
          fill="none"
          stroke="rgba(126,214,226,0.22)"
          strokeWidth="2" />
        
        <path d="M0 8 L120 112 L260 40 L400 132" fill="none" stroke="rgba(126,214,226,0.18)" strokeWidth="2" />
      </svg>

      {markers.map((marker, index) =>
      <div
        key={`${marker.x}-${marker.y}-${index}`}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}>
        
          {marker.pulse &&
        <span
          className="absolute inset-0 -m-2 animate-pulse-ring rounded-[10px]"
          style={{ backgroundColor: toneColor[marker.tone ?? 'accent'], opacity: 0.3 }} />

        }
          <span
          className="relative flex h-7 w-7 items-center justify-center rounded-[8px] border-2 text-[14px] leading-none"
          style={{
            borderColor: toneColor[marker.tone ?? 'accent'],
            backgroundColor: 'rgba(6,16,36,0.92)',
            boxShadow: `0 0 14px ${toneColor[marker.tone ?? 'accent']}`
          }}>
          
            <span aria-hidden>🚬</span>
          </span>
          {marker.label &&
        <span className="absolute start-1/2 top-8 -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-[#1E5A72] bg-[#061024]/95 px-2 py-0.5 font-display text-[9px] tracking-widest text-white">
              {marker.label}
            </span>
        }
        </div>
      )}
    </div>);

}