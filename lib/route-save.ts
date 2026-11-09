import type { SupabaseClient } from '@supabase/supabase-js';
import type { RouteResult } from './routes';
import { MAX_ROUTE_POINTS, MAX_INTERMEDIATE_STOPS } from './route-limits';
import { validLocation } from './location-book';
type SaveDetails = { name: string; vehicleId: string | null; mode: 'delivery' | 'truck'; vehicle: { heightM: number; widthM: number; lengthM: number; grossWeightT: number; axleWeightT: number } | null };
export function routeSaveData(route: RouteResult, details: SaveDetails) {
  const points = route.waypoints || [];
  if (points.length < 2 || points.length > MAX_ROUTE_POINTS) throw new Error(`El cálculo debe contener origen, destino y hasta ${MAX_INTERMEDIATE_STOPS} paradas intermedias para guardarse.`);
  const locations = points.map((point, index) => {
    const location = { label: point.label || `${point.lat}, ${point.lng}`, lat: point.lat, lng: point.lng };
    if (!validLocation(location)) throw new Error(`El punto ${index + 1} no contiene una dirección y coordenadas válidas.`);
    return location;
  });
  if (!details.name.trim() || details.name.trim().length > 120) throw new Error('El nombre del recorrido debe tener entre 1 y 120 caracteres.');
  return {
    p_route: { name: details.name.trim(), vehicle_id: details.vehicleId, origin: locations[0], destination: locations[locations.length - 1], route_metadata: { mode: details.mode, vehicle: details.vehicle, result: route } },
    p_stops: locations.slice(1, -1),
  };
}
export async function persistRoute(client: Pick<SupabaseClient, 'rpc'>, data: ReturnType<typeof routeSaveData>, requestId: string): Promise<string> {
  const { data: id, error } = await client.rpc('save_route_with_stops', { p_request_id: requestId, ...data });
  if (error) throw new Error('No se pudo guardar el recorrido completo: ' + error.message);
  if (typeof id !== 'string' || !id) throw new Error('El servidor no confirmó el identificador de la ruta. Puedes reintentar sin duplicarla.');
  return id;
}
