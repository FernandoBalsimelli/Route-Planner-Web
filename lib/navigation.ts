import type { Coordinates } from './locations';

export function googleMapsUrls(points: Array<string | Coordinates | null | undefined>): string[] {
  const values = points.map(point => {
    if (typeof point === 'string') return point.trim();
    return point && Number.isFinite(point.lat) && Number.isFinite(point.lng) ? `${point.lat}, ${point.lng}` : '';
  }).filter(Boolean);
  const links: string[] = [];
  // Three intermediate waypoints also work in mobile browsers. Consecutive
  // segments share their endpoint so every selected stop remains represented.
  for (let start = 0; start < values.length - 1; start += 4) {
    const segment = values.slice(start, start + 5);
    const url = new URL('https://www.google.com/maps/dir/');
    url.searchParams.set('api', '1');
    url.searchParams.set('origin', segment[0]);
    url.searchParams.set('destination', segment[segment.length - 1]);
    url.searchParams.set('travelmode', 'driving');
    if (segment.length > 2) url.searchParams.set('waypoints', segment.slice(1, -1).join('|'));
    links.push(url.toString());
  }
  return links;
}
