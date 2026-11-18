export type ParkingSchedule = { days: number[]; status: string; start?: string; end?: string; literal?: string };
export type ParkingCorridor = {
  sourceRow: number; polygon: string; corridor: string; betweenStreets: string;
  sourcePages: number[]; publishedSourcePages?: number[]; schedules: ParkingSchedule[]; directionStatus: string;
  geometry: null; geometryStatus: string; routingEnforced: false;
};
export type ParkingCorridorReference = {
  municipalityId: string; activity: 'parking_operation'; timezone: string;
  status: 'reference_only'; routingEnforced: false;
  source: { url: string; approvedAt: string; consultedAt: string; pages: number[]; reviewStatus: string; publicationAndCurrentValidity: string };
  notices: string[]; duplicateGroups: number[][]; rows: ParkingCorridor[];
  publicationReview?: ParkingPublicationReview;
  annexComparison?: ParkingAnnexComparison;
};
export type ParkingPublicationReview = {
  status: 'partial_history'; reviewedAt: string; routingEnforced: false;
  publication: { date: string; status: 'corroborated_in_official_gazette' };
  sources: { id: string; title: string; url: string }[];
  records: { id: string; resolution: string; title: string; description: string; scope: string; approvedAt: string; publishedAt: string; sourceIds: string[];
    sanctions: { fromDate: string; status: 'superseded' | 'amended_date_cited'; label: string; supersededBy?: string } }[];
  notices: string[];
};
const normalized = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function filterParkingCorridors(rows: ParkingCorridor[], query: string, polygon: string): ParkingCorridor[] {
  const terms = normalized(query).split(/\s+/).filter(Boolean);
  return rows.filter(row => {
    if (polygon && row.polygon !== polygon) return false;
    const text = normalized(`${row.polygon} ${row.corridor} ${row.betweenStreets}`);
    const words = new Set(text.split(' '));
    // Street numbers and one-letter suffixes must be complete words: 29 A
    // must not match 129 or the A inside the polygon name Alejandro.
    return terms.every(term => term.length === 1 || /^\d+$/.test(term) ? words.has(term) : text.includes(term));
  });
}
export function citedParkingHours(schedule: ParkingSchedule): string {
  if (schedule.status === 'not_applicable_in_source') return '«No aplica» en el anexo';
  if (schedule.status === 'hours_cited' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(schedule.start || '') && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(schedule.end || '')) return `${schedule.start}–${schedule.end}`;
  return 'Sin horario verificado';
}

export type ParkingAnnexComparison = {
  status: 'selected_fields_match_after_normalization'; reviewedAt: string;
  routingEnforced: false; legalValidityVerified: false; scope: string;
  matchedRows: number; extractedTextDifferenceCount: number; normalization: string[]; notices: string[];
  documents: { id: 'acta' | 'published'; title: string; url: string; sha256: string; pages: number[] }[];
};
// A comparison page is corroboration only, never a replacement permission.
export function publishedAnnexPageLinks(reference: ParkingCorridorReference, row: ParkingCorridor): { page: number; url: string }[] {
  const comparison = reference.annexComparison;
  const source = comparison?.documents.find(doc => doc.id === 'published');
  if (!comparison || comparison.status !== 'selected_fields_match_after_normalization' || comparison.routingEnforced !== false || comparison.legalValidityVerified !== false || comparison.matchedRows !== reference.rows.length || !source || !row.publishedSourcePages?.length) return [];
  try { const url = new URL(source.url); if (url.protocol !== 'https:' || url.hostname !== 'gaceta.pueblacapital.gob.mx' || url.username || url.password || url.port) return []; } catch { return []; }
  const pages = row.publishedSourcePages;
  if (new Set(pages).size !== pages.length || pages.some(page => !Number.isSafeInteger(page) || !source.pages.includes(page) || page < 1 || page > 7)) return [];
  return pages.map(page => ({ page, url: `${source.url}#page=${page}` }));
}
