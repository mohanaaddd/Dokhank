import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MarkerPoint {
  x: number;
  y: number;
  tone?: 'accent' | 'cyan' | 'magenta';
  pulse?: boolean;
  label?: string;
}

interface DeliveryMapProps {
  markers: MarkerPoint[];
  onPick?: (point: {x: number;y: number;}) => void;
  className?: string;
  height?: string;
  locateKey?: number;
}

const CAIRO_CENTER: L.LatLngExpression = [30.0444, 31.2357];
const MAP_BOUNDS = {
  north: 30.18,
  south: 29.85,
  west: 30.95,
  east: 31.55
};

function pointToLatLng(point: MarkerPoint): L.LatLngExpression {
  return [
    MAP_BOUNDS.north - point.y * (MAP_BOUNDS.north - MAP_BOUNDS.south),
    MAP_BOUNDS.west + point.x * (MAP_BOUNDS.east - MAP_BOUNDS.west)
  ];
}

function latLngToPoint(lat: number, lng: number) {
  return {
    x: Math.min(0.96, Math.max(0.04, (lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west))),
    y: Math.min(0.94, Math.max(0.06, (MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)))
  };
}

function markerIcon(marker: MarkerPoint) {
  const color = marker.tone === 'cyan' ? '#22E4F5' : marker.tone === 'magenta' ? '#FF3DCB' : 'var(--accent)';
  const emoji = marker.tone === 'cyan' ? '🚬' : '🧑‍🚬';
  return L.divIcon({
    className: 'spidey-marker-wrap',
    html: `<span class="spidey-marker${marker.pulse ? ' spidey-marker-pulse' : ''}" style="--marker-color:${color}">${emoji}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function ClickHandler({ onPick }: {onPick?: DeliveryMapProps['onPick'];}) {
  useMapEvents({
    click(event) {
      onPick?.(latLngToPoint(event.latlng.lat, event.latlng.lng));
    }
  });
  return null;
}

function DeviceLocation({ locateKey, onPick }: {locateKey: number;onPick?: DeliveryMapProps['onPick'];}) {
  const map = useMap();

  useEffect(() => {
    if (!locateKey || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 14, { animate: true });
        onPick?.(latLngToPoint(latitude, longitude));
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [locateKey, map, onPick]);

  return null;
}

export function DeliveryMap({ markers, onPick, className = '', height = 'h-56', locateKey = 0 }: DeliveryMapProps) {
  const icons = useMemo(() => markers.map(markerIcon), [markers]);

  return (
    <div className={['relative w-full overflow-hidden rounded-chunk border-2 border-[#1E5A72] bg-[#0A1433]', height, className].join(' ')}>
      <MapContainer center={CAIRO_CENTER} zoom={12} zoomControl={false} className="h-full w-full spidey-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPick} />
        <DeviceLocation locateKey={locateKey} onPick={onPick} />
        {markers.map((marker, index) =>
          <Marker key={`${marker.x}-${marker.y}-${index}`} position={pointToLatLng(marker)} icon={icons[index]} />
        )}
      </MapContainer>
      <div className="pointer-events-none absolute inset-0 z-[400] rounded-[inherit] bg-[#061024]/35 mix-blend-multiply" />
    </div>
  );
}
