import { validLocation } from './location-book';
import { MAX_INTERMEDIATE_STOPS } from './route-limits';
import type { LocationSelection } from './locations';
import type { RouteResult } from './routes';

function readPoint(input: unknown): { value: string; selected: LocationSelection | null } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Una ubicación guardada está incompleta. No se cargó un recorrido parcial.');
  const point = input as Record<string, unknown>;
  const coordinates = typeof point.lat === 'number' && Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 && typeof point.lng === 'number' && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180;
  const label = typeof point.label === 'string' && point.label.trim() ? point.label : coordinates ? `${point.lat}, ${point.lng}` : '';
  if (!label || label.length > 180) throw Error('Una ubicación guardada está incompleta. No se cargó un recorrido parcial.');
  const selected = { label, lat: point.lat, lng: point.lng };
  return { value: label, selected: validLocation(selected) ? selected : null };
}

// Load every ordered occurrence first; never partially replace the planner.
export function readSavedRoutePoints(origin: unknown, destination: unknown, rows: unknown) {
  if (!Array.isArray(rows) || rows.length > MAX_INTERMEDIATE_STOPS) throw Error('La lista guardada supera el límite del proveedor o está incompleta. No se recortaron tus entregas.');
  const first = rows[0]?.sequence;
  if (rows.length && first !== 0 && first !== 1) throw Error('El orden de las paradas guardadas está incompleto. No se cargó un recorrido parcial.');
  const stops = Array.from(rows, (row, index) => {
    if (!row || !Number.isSafeInteger(row.sequence) || row.sequence !== first + index) throw Error('El orden de las paradas guardadas está incompleto. No se cargó un recorrido parcial.');
    return readPoint(row.location);
  });
  return { origin: readPoint(origin), destination: readPoint(destination), stops };
}

// Point identity only: matching does not revalidate geometry, age or legality.
export function savedCalculationMatchesPoints(result: RouteResult | undefined, points: ReturnType<typeof readSavedRoutePoints>): boolean {
  const expected = [points.origin, ...points.stops, points.destination];
  if (!Array.isArray(result?.waypoints) || result.waypoints.length !== expected.length) return false;
  return expected.every((entry, index) => {
    const point = result.waypoints![index], current = entry.selected;
    return Boolean(current && point && point.lat === current.lat && point.lng === current.lng && (point.label || `${point.lat}, ${point.lng}`) === current.label && point.type === (index === 0 ? 'origin' : index === expected.length - 1 ? 'destination' : 'stop'));
  });
}
