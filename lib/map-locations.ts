import type { LocationSelection } from './locations';
export function candidateMapPoints(candidates: LocationSelection[]): Array<[number, number]> {
  if (!candidates.length) return [];
  const first = candidates[0], radians = Math.PI / 180;
  return candidates.filter(point => {
    const h = Math.sin((point.lat - first.lat) * radians / 2) ** 2 + Math.cos(first.lat * radians) * Math.cos(point.lat * radians) * Math.sin((point.lng - first.lng) * radians / 2) ** 2;
    return 12742000 * Math.asin(Math.sqrt(Math.min(1, h))) <= 100000;
  }).map(point => [point.lat, point.lng]);
}
