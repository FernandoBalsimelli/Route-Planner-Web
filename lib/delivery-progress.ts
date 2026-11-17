import type { Coordinates } from './locations';
export type ProgressRevision = { revision: number; completedSequences: number[]; samePoints: boolean; createdAt: string };
export type DeliveryProgress = { routeId: string; snapshot: string; revision: number; stale: boolean; points: (Coordinates & { label: string })[]; completedSequences: number[]; history: ProgressRevision[]; updatedAt: string | null };
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('El servidor devolvió un avance incompleto. Actualiza la consulta.'); return value as Record<string, unknown>; }
function sequences(value: unknown, maximum: number): number[] {
  if (!Array.isArray(value) || value.length > maximum || value.some(n => !Number.isSafeInteger(n) || n < 1 || n > maximum) || new Set(value).size !== value.length) throw Error('El servidor devolvió números de entrega inválidos.');
  return [...value].sort((a, b) => a - b);
}
export function parseDeliveryProgress(value: unknown, routeId: string): DeliveryProgress {
  const p = object(value);
  if (p.routeId !== routeId || typeof p.snapshot !== 'string' || !/^[0-9a-f]{64}$/.test(p.snapshot) || !Number.isSafeInteger(p.revision) || (p.revision as number) < 0 || typeof p.stale !== 'boolean' || !Array.isArray(p.points) || p.points.length < 2 || p.points.length > 50 || !Array.isArray(p.history) || p.history.length > 10 || (p.updatedAt !== null && (typeof p.updatedAt !== 'string' || !Number.isFinite(Date.parse(p.updatedAt))))) throw Error('El avance no corresponde a esta ruta o está incompleto.');
  const points = p.points.map(input => { const point = object(input); if (typeof point.label !== 'string' || !point.label.trim() || point.label.length > 180 || typeof point.lat !== 'number' || !Number.isFinite(point.lat) || Math.abs(point.lat) > 90 || typeof point.lng !== 'number' || !Number.isFinite(point.lng) || Math.abs(point.lng) > 180) throw Error('Faltan ubicaciones verificadas en el avance.'); return { label: point.label, lat: point.lat, lng: point.lng }; });
  const history = p.history.map(input => { const row = object(input); if (!Number.isSafeInteger(row.revision) || (row.revision as number) < 1 || typeof row.samePoints !== 'boolean' || typeof row.createdAt !== 'string' || !Number.isFinite(Date.parse(row.createdAt))) throw Error('No se pudo verificar el historial del avance.'); return { revision: row.revision as number, samePoints: row.samePoints, createdAt: row.createdAt, completedSequences: sequences(row.completedSequences, row.samePoints ? points.length - 1 : 49) }; });
  return { routeId, snapshot: p.snapshot, revision: p.revision as number, stale: p.stale, points, history, completedSequences: sequences(p.completedSequences, points.length - 1), updatedAt: p.updatedAt as string | null };
}
