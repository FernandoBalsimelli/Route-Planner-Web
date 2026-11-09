import type { LocationSelection } from './locations';
export type FavoriteLocation = { id: string; name: string; address_label: string; lat: number; lng: number; plus_code?: string | null };
export const FAVORITE_COLUMNS = 'id,name,address_label,lat,lng,plus_code';
export function validLocation(value: unknown): value is LocationSelection {
  if (!value || typeof value !== 'object') return false;
  const point = value as LocationSelection;
  return typeof point.label === 'string' && point.label.trim().length > 0 && point.label.length <= 180 && Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180;
}
export function sameLocation(a: { lat: number; lng: number }, b: { lat: number; lng: number }) { return a.lat === b.lat && a.lng === b.lng; }
export function rememberLocation(recent: LocationSelection[], point: LocationSelection) {
  if (!validLocation(point)) return recent;
  // Store only reusable address data, not the original GPS accuracy or source.
  const safe = { label: point.label, lat: point.lat, lng: point.lng, ...(point.plusCode ? { plusCode: point.plusCode } : {}) };
  return [safe, ...recent.filter(item => !sameLocation(item, point))].slice(0, 12);
}
export function recentKey(ownerId?: string) { return `route-planner:recent-locations:v1:${ownerId || 'guest'}`; }
export function readRecent(raw: string | null): LocationSelection[] {
  try { const value: unknown = JSON.parse(raw || '[]'); return Array.isArray(value) ? value.filter(validLocation).slice(0, 12) : []; } catch { return []; }
}
export function favoritePoint(favorite: FavoriteLocation): LocationSelection { return { label: favorite.address_label, lat: favorite.lat, lng: favorite.lng, ...(favorite.plus_code ? { plusCode: favorite.plus_code } : {}) }; }
