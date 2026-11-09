import type { RouteResult } from './routes';
import { decodePolyline } from './polyline';
const xml = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '').replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);
function points(route: RouteResult) {
  const locations = route.waypoints || [];
  if (locations.length < 2 || locations.some(point => !Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180)) throw new Error('El recorrido no contiene suficientes puntos válidos para exportar.');
  return locations;
}
const csvText = (text: string) => '"' + (/^[\s]*[=+\-@]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"';
export function routeCsv(route: RouteResult): string {
  return '\uFEFF' + ['orden,tipo,direccion,latitud,longitud', ...points(route).map((point, index) => [index + 1, csvText(point.type), csvText(point.label || ''), point.lat, point.lng].join(','))].join('\r\n') + '\r\n';
}
export function routeGpx(route: RouteResult, truck = false): string {
  const locations = points(route);
  const geometry = route.polyline ? decodePolyline(route.polyline) : [];
  const name = truck ? 'Recorrido de camión' : 'Recorrido de reparto';
  const longitude = (lng: number) => lng === 180 ? -180 : lng;
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<gpx version="1.1" creator="Route Planner" xmlns="http://www.topografix.com/GPX/1/1">' +
    `<metadata><name>${name}</name><desc>${truck ? 'El archivo no transfiere las restricciones de dimensiones y peso al navegador de destino. Verifica las condiciones de circulación.' : 'Puntos confirmados y trazado del proveedor cuando está disponible.'}</desc></metadata>` +
    `<rte><name>${name}</name>${locations.map((point, index) => `<rtept lat="${point.lat}" lon="${longitude(point.lng)}"><name>${xml(point.label || `Punto ${index + 1}`)}</name></rtept>`).join('')}</rte>` +
    (geometry.length >= 2 ? `<trk><name>Trazado calculado por OpenRouteService</name><trkseg>${geometry.map(([lat, lng]) => `<trkpt lat="${lat}" lon="${longitude(lng)}"/>`).join('')}</trkseg></trk>` : '') + '</gpx>';
}
export function routeGeoJson(route: RouteResult, truck = false): string {
  const locations = points(route);
  const geometry = route.polyline ? decodePolyline(route.polyline) : [];
  const features: object[] = locations.map((point, index) => ({ type: 'Feature', properties: { order: index + 1, type: point.type, label: point.label || '' }, geometry: { type: 'Point', coordinates: [point.lng, point.lat] } }));
  if (geometry.length >= 2) features.push({ type: 'Feature', properties: { provider: 'openrouteservice', distanceMeters: route.distanceMeters, durationSeconds: route.durationSeconds, truckRestrictionsTransferred: false, mode: truck ? 'truck' : 'delivery' }, geometry: { type: 'LineString', coordinates: geometry.map(([lat, lng]) => [lng, lat]) } });
  return JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
}
