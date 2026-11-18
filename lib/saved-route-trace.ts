import { parseDeliveryProgress, reviewDeliveryNavigation, type DeliveryProgress } from './delivery-progress';
import { decodePolyline } from './polyline';
import { readRoutePreferences, type RoutePreferences } from './route-preferences';

type Point = { lat: number; lng: number; label: string; type: string; sequence: number };
export type SavedRouteTrace = { polyline: string; waypoints: Point[]; distanceMeters: number; durationSeconds: number };
const changed = 'El recorrido o su avance cambió. Cierra la revisión y vuelve a revisar la navegación antes de consultar el trazado.';

// A preview is the complete stored calculation, never a newly routed shortcut.
export function parseSavedRouteTrace(input: unknown, refreshedProgress: unknown, progress: DeliveryProgress, truck: boolean, preferences: RoutePreferences): SavedRouteTrace {
  const current = parseDeliveryProgress(refreshedProgress, progress.routeId);
  if (current.stale || current.snapshot !== progress.snapshot || current.revision !== progress.revision || JSON.stringify(current.completedSequences) !== JSON.stringify(progress.completedSequences)) throw Error(changed);
  reviewDeliveryNavigation(current, progress.points);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('No hay un trazado guardado disponible. Carga la ruta completa y vuelve a calcular si lo necesitas.');
  const value = input as Record<string, unknown>;
  const selected = readRoutePreferences(value.preferences);
  if (value.mode !== (truck ? 'truck' : 'delivery') || selected.avoidTolls !== preferences.avoidTolls || selected.avoidHighways !== preferences.avoidHighways) throw Error(changed);
  if (typeof value.polyline !== 'string' || !value.polyline || !Array.isArray(value.waypoints) || value.waypoints.length !== current.points.length) throw Error('Falta el trazado o la lista completa de puntos del cálculo guardado. Carga la ruta completa para revisarla.');
  if (value.polyline.length > 500_000) throw Error('El trazado es demasiado extenso para esta vista previa. Carga la ruta completa; no se recortarán tus entregas.');
  const geometry = decodePolyline(value.polyline);
  if (geometry.length < 2 || geometry.length > 100_000) throw Error('El trazado guardado no se puede representar en esta vista previa. Carga la ruta completa para revisarlo.');
  const waypoints = value.waypoints.map((input, index) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error(changed);
    const point = input as Record<string, unknown>, expected = current.points[index];
    const label = point.label || `${point.lat}, ${point.lng}`;
    if (point.lat !== expected.lat || point.lng !== expected.lng || label !== expected.label) throw Error(changed);
    return { ...expected, sequence: index, type: index === 0 ? 'origin' : index === current.points.length - 1 ? 'destination' : 'stop' };
  });
  if (typeof value.distanceMeters !== 'number' || !Number.isFinite(value.distanceMeters) || value.distanceMeters < 0 || typeof value.durationSeconds !== 'number' || !Number.isFinite(value.durationSeconds) || value.durationSeconds < 0) throw Error('Faltan distancia o duración válidas en el cálculo guardado. Carga la ruta completa para revisarla.');
  return { polyline: value.polyline, waypoints, distanceMeters: value.distanceMeters, durationSeconds: value.durationSeconds };
}
