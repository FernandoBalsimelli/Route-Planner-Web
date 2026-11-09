import type { Coordinates } from './locations';

export type NavigationPoint = string | (Coordinates & { navigationLabel?: string }) | null | undefined;
export type GoogleWaypointLimit = 3 | 9;
export type NavigationSegment = { url: string; startIndex: number; endIndex: number; startLabel: string; endLabel: string };
const MAX_URL_LENGTH = 2048;

function directionsUrl(values: string[]) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', values[0]);
  url.searchParams.set('destination', values[values.length - 1]);
  url.searchParams.set('travelmode', 'driving');
  url.searchParams.set('dir_action', 'navigate');
  if (values.length > 2) url.searchParams.set('waypoints', values.slice(1, -1).join('|'));
  return url.toString();
}

export function googleMapsSegments(points: NavigationPoint[], maxWaypoints: GoogleWaypointLimit = 9): NavigationSegment[] {
  const values = points.map(point => {
    if (typeof point === 'string') return {value:point.trim(),label:''};
    return point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180 ? {value:`${point.lat}, ${point.lng}`,label:point.navigationLabel||''} : {value:'',label:''};
  }).filter(point=>Boolean(point.value));
  const segments: NavigationSegment[] = [];
  const limit = maxWaypoints === 3 ? 3 : 9;
  for (let start = 0; start < values.length - 1;) {
    let end = Math.min(start + limit + 1, values.length - 1);
    let url = directionsUrl(values.slice(start, end + 1).map(point=>point.value));
    // Encoded addresses can reach the URL limit before the waypoint limit.
    // Reduce this segment without dropping any point from the next one.
    while (url.length > MAX_URL_LENGTH && end > start + 1) {
      end--; url = directionsUrl(values.slice(start, end + 1).map(point=>point.value));
    }
    if (url.length > MAX_URL_LENGTH) throw new Error('Confirma estos puntos en el mapa para abrir sus coordenadas: las direcciones escritas superan el tamaño de enlace admitido por Google Maps.');
    segments.push({ url, startIndex: start, endIndex: end, startLabel:values[start].label||(start===0?'Origen':`Parada ${start}`),endLabel:values[end].label||(end===values.length-1?'Destino':`Parada ${end}`) });
    start = end; // The next leg starts exactly where this one ends.
  }
  return segments;
}

export function googleMapsUrls(points: NavigationPoint[], maxWaypoints: GoogleWaypointLimit = 9): string[] {
  return googleMapsSegments(points, maxWaypoints).map(segment => segment.url);
}
