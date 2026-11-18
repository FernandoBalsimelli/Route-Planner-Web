export type ProvisionDocumentReview = {
  municipalityId: string; status: 'selected_text_matches_after_whitespace'; reviewedAt: string;
  routingEnforced: false; legalValidityVerified: false; scope: string; normalization: string; notices: string[];
  documents: { id: 'acta' | 'published'; title: string; url: string; sha256: string; pages: number[]; documentPages: number }[];
  articles: { number: number; normalizedSha256: string; characters: number }[];
};
const text = (value: unknown, maximum = 1000): value is string => typeof value === 'string' && !!value.trim() && value.length <= maximum;
const hash = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
export function parseProvisionReview(input: unknown, municipalityId: string): ProvisionDocumentReview | null {
  const p = object(input);
  if (!p || !/^\d{5}$/.test(municipalityId) || p.municipalityId !== municipalityId || p.status !== 'selected_text_matches_after_whitespace' || p.routingEnforced !== false || p.legalValidityVerified !== false || !text(p.scope) || !text(p.normalization) || typeof p.reviewedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.reviewedAt) || !Number.isFinite(Date.parse(p.reviewedAt)) || new Date(p.reviewedAt).toISOString().slice(0, 10) !== p.reviewedAt || !Array.isArray(p.notices) || p.notices.length > 10 || p.notices.some(item => !text(item)) || !Array.isArray(p.documents) || p.documents.length !== 2 || !Array.isArray(p.articles) || !p.articles.length || p.articles.length > 3) return null;
  const documents: ProvisionDocumentReview['documents'] = [];
  for (const item of p.documents) {
    const doc = object(item);
    if (!doc || !['acta', 'published'].includes(String(doc.id)) || !text(doc.title, 180) || !hash(doc.sha256) || typeof doc.url !== 'string' || !Number.isSafeInteger(doc.documentPages) || (doc.documentPages as number) < 1 || (doc.documentPages as number) > 2000 || !Array.isArray(doc.pages) || !doc.pages.length || doc.pages.length > 10 || doc.pages.some(page => !Number.isSafeInteger(page) || page < 1 || page > (doc.documentPages as number)) || new Set(doc.pages).size !== doc.pages.length) return null;
    try { const url = new URL(doc.url); if (url.protocol !== 'https:' || url.hostname !== 'gaceta.pueblacapital.gob.mx' || url.username || url.password || url.port || url.hash) return null; } catch { return null; }
    documents.push({ id: doc.id as 'acta' | 'published', title: doc.title, url: doc.url, sha256: doc.sha256, pages: doc.pages as number[], documentPages: doc.documentPages as number });
  }
  if (new Set(documents.map(doc => doc.id)).size !== 2) return null;
  const articles: ProvisionDocumentReview['articles'] = [];
  for (const item of p.articles) { const row = object(item); if (!row || ![11, 12, 13].includes(row.number as number) || !hash(row.normalizedSha256) || !Number.isSafeInteger(row.characters) || (row.characters as number) < 1) return null; articles.push({ number: row.number as number, normalizedSha256: row.normalizedSha256, characters: row.characters as number }); }
  if (new Set(articles.map(row => row.number)).size !== articles.length) return null;
  return { municipalityId, status: 'selected_text_matches_after_whitespace', reviewedAt: p.reviewedAt, routingEnforced: false, legalValidityVerified: false, scope: p.scope, normalization: p.normalization, notices: p.notices as string[], documents, articles };
}
