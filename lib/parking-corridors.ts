export type ParkingSchedule = { days: number[]; status: string; start?: string; end?: string; literal?: string };
export type ParkingCorridor = {
  sourceRow: number; polygon: string; corridor: string; betweenStreets: string;
  sourcePages: number[]; schedules: ParkingSchedule[]; directionStatus: string;
  geometry: null; geometryStatus: string; routingEnforced: false;
};
export type ParkingCorridorReference = {
  municipalityId: string; activity: 'parking_operation'; timezone: string;
  status: 'reference_only'; routingEnforced: false;
  source: { url: string; approvedAt: string; consultedAt: string; pages: number[]; reviewStatus: string; publicationAndCurrentValidity: string };
  notices: string[]; duplicateGroups: number[][]; rows: ParkingCorridor[];
};
const normalized = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function filterParkingCorridors(rows: ParkingCorridor[], query: string, polygon: string): ParkingCorridor[] {
  const terms = normalized(query).split(/\s+/).filter(Boolean);
  return rows.filter(row => (!polygon || row.polygon === polygon) && terms.every(term => normalized(`${row.polygon} ${row.corridor} ${row.betweenStreets}`).includes(term)));
}
export function citedParkingHours(schedule: ParkingSchedule): string {
  if (schedule.status === 'not_applicable_in_source') return '«No aplica» en el anexo';
  if (schedule.status === 'hours_cited' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(schedule.start || '') && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(schedule.end || '')) return `${schedule.start}–${schedule.end}`;
  return 'Sin horario verificado';
}
