/**
 * The delivery map is a stylised SVG board driven by normalized 0-1 `x`/`y`
 * coordinates. Real `lat`/`lng` live next to them in the database; this is the
 * only place the two representations are converted.
 *
 * The window matches the projection the address form already uses:
 *   lat = 30.09 - y * 0.12   (north → south)
 *   lng = 31.19 + x * 0.14   (west  → east)
 */
export const CAIRO_WINDOW = {
  north: 30.09,
  west: 31.19,
  latSpan: 0.12,
  lngSpan: 0.14
} as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function toLatLng(point: {x: number;y: number;}): {lat: number;lng: number;} {
  return {
    lat: Number((CAIRO_WINDOW.north - clamp01(point.y) * CAIRO_WINDOW.latSpan).toFixed(6)),
    lng: Number((CAIRO_WINDOW.west + clamp01(point.x) * CAIRO_WINDOW.lngSpan).toFixed(6))
  };
}

export function toCanvas(coords: {lat: number;lng: number;}): {x: number;y: number;} {
  return {
    x: Number(clamp01((coords.lng - CAIRO_WINDOW.west) / CAIRO_WINDOW.lngSpan).toFixed(3)),
    y: Number(clamp01((CAIRO_WINDOW.north - coords.lat) / CAIRO_WINDOW.latSpan).toFixed(3))
  };
}