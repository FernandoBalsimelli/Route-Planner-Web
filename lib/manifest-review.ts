import type { LocationSelection } from './locations';

export type ManifestReviewCandidate = {
  value: string;
  selected: LocationSelection | null;
  enabled: boolean;
};

/** Positions refer to the original manifest, including excluded rows. */
export function repeatedManifestLines(values: string[]): number[][] {
  const groups = new Map<string, number[]>();
  values.forEach((value, index) => {
    const key = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
    if (!key) return;
    const positions = groups.get(key) || [];
    positions.push(index + 1);
    groups.set(key, positions);
  });
  return [...groups.values()].filter(group => group.length > 1);
}

export const MANIFEST_NEARBY_METERS = 10;
export function nearbyManifestLocations(rows: ManifestReviewCandidate[]) {
  const confirmed = rows.flatMap((row, index) => {
    const point = row.selected;
    return row.enabled && point && point.label === row.value &&
      Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 &&
      Number.isFinite(point.lng) && Math.abs(point.lng) <= 180
      ? [{ point, position: index + 1 }] : [];
  });
  const pairs: Array<{ first: number; second: number; distanceMeters: number }> = [];
  const rad = Math.PI / 180;
  for (let i = 0; i < confirmed.length; i++) {
    for (let j = i + 1; j < confirmed.length; j++) {
      const a = confirmed[i].point, b = confirmed[j].point;
      const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
        Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
      const distanceMeters = 12742000 * Math.asin(Math.sqrt(Math.min(1, h)));
      if (distanceMeters <= MANIFEST_NEARBY_METERS) {
        pairs.push({ first: confirmed[i].position, second: confirmed[j].position, distanceMeters });
      }
    }
  }
  return pairs;
}
