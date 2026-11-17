import type { LocationSelection } from './locations';
import type { RoutePreferences } from './route-preferences';
import { MAX_INTERMEDIATE_STOPS } from './route-limits';
import { operatingForm, operatingInput, type VehicleOperatingInput } from './vehicle-operating';

export type SharedVehicle = VehicleOperatingInput & { heightM: number; widthM: number; lengthM: number; grossWeightT: number; axleWeightT: number };
export type SharedRouteDraft = { schemaVersion: 1; name: string; mode: 'delivery' | 'truck'; origin: LocationSelection; destination: LocationSelection; stops: LocationSelection[]; vehicle: SharedVehicle | null; preferences: RoutePreferences };
export const SHARE_TIMEOUT_MS = 30000;
export const SHARE_METADATA_COLUMNS = 'id,owner_id,route_id,created_at,expires_at,revoked_at';
export const validShareToken = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
// null means no share intent; an empty string means a malformed share link.
export function shareTokenFromHash(hash: string): string | null {
  if (!hash.startsWith('#compartir=')) return null;
  const token = hash.slice('#compartir='.length);
  return validShareToken(token) ? token : '';
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('El enlace contiene datos de ruta inválidos.');
  return value as Record<string, unknown>;
}
function point(value: unknown): LocationSelection {
  const p = object(value);
  if (typeof p.label !== 'string' || !p.label.trim() || p.label.length > 180 || typeof p.lat !== 'number' || !Number.isFinite(p.lat) || p.lat < -90 || p.lat > 90 || typeof p.lng !== 'number' || !Number.isFinite(p.lng) || p.lng < -180 || p.lng > 180) throw new Error('Una ubicación compartida no tiene dirección y coordenadas válidas.');
  return { label: p.label.trim(), lat: p.lat, lng: p.lng };
}
export function parseSharedRoute(value: unknown): { draft: SharedRouteDraft; expiresAt: string } {
  const response = object(value), d = object(response.draft), prefs = object(d.preferences);
  if (typeof response.expiresAt !== 'string' || !Number.isFinite(Date.parse(response.expiresAt)) || d.schemaVersion !== 1 || typeof d.name !== 'string' || !d.name.trim() || d.name.length > 120 || typeof d.mode !== 'string' || !['truck', 'delivery'].includes(d.mode) || !Array.isArray(d.stops) || d.stops.length > MAX_INTERMEDIATE_STOPS || typeof prefs.avoidTolls !== 'boolean' || typeof prefs.avoidHighways !== 'boolean') throw new Error('El enlace contiene datos incompletos o supera el límite del proveedor. No se cargaron entregas.');
  let vehicle: SharedVehicle | null = null;
  if (d.mode === 'truck') {
    const v = object(d.vehicle);
    const dimensions: Record<string, number> = {};
    for (const [key, maximum] of [['heightM', 10], ['widthM', 5], ['lengthM', 30], ['grossWeightT', 100], ['axleWeightT', 30]] as const) {
      const n = v[key];
      if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0 || n > maximum) throw new Error('Faltan medidas o pesos válidos del camión compartido.');
      dimensions[key] = n;
    }
    if ((v.axleCount !== undefined && typeof v.axleCount !== 'number') || (v.configuration !== undefined && typeof v.configuration !== 'string') || (v.payloadCapacityT !== undefined && typeof v.payloadCapacityT !== 'number')) throw new Error('El perfil del camión compartido no es válido.');
    const operating = operatingInput(operatingForm({ axleCount: v.axleCount as number | undefined, configuration: v.configuration as string | undefined, payloadCapacityT: v.payloadCapacityT as number | undefined }));
    vehicle = { ...dimensions, ...operating } as SharedVehicle;
  }
  // Whitelist again at the receiving boundary. Never import account identifiers,
  // saved vehicle IDs, computed geometry, metrics or legal coverage from a link.
  return { expiresAt: response.expiresAt, draft: { schemaVersion: 1, name: d.name.trim(), mode: d.mode as SharedRouteDraft['mode'], origin: point(d.origin), destination: point(d.destination), stops: d.stops.map(point), vehicle, preferences: { avoidTolls: prefs.avoidTolls, avoidHighways: prefs.avoidHighways } } };
}
