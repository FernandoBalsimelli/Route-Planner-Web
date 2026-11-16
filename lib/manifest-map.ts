import type { LocationSelection } from './locations';

export type ManifestMapSearch = {
  requestId: string;
  candidateId: string;
  value: string;
  title: string;
  points: LocationSelection[];
};
export type ManifestMapSelection = { requestId: string; point: LocationSelection };

// A map result can only confirm the currently reviewed row and query. Return
// the canonical suggestion, never data supplied by an obsolete map popup.
export function manifestMapPoint(
  search: ManifestMapSearch | null,
  selection: ManifestMapSelection,
  rows: Array<{ id: string; value: string; enabled: boolean }>,
  activeId: string,
  active: boolean,
): LocationSelection | null {
  if (!active || !search || selection.requestId !== search.requestId || activeId !== search.candidateId) return null;
  const row = rows.find(item => item.id === search.candidateId);
  if (!row?.enabled || row.value !== search.value) return null;
  return search.points.find(point => Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 &&
    Number.isFinite(point.lng) && Math.abs(point.lng) <= 180 &&
    point.lat === selection.point.lat && point.lng === selection.point.lng && point.label === selection.point.label) || null;
}
