// PostgREST ilike treats * as %, even when it was typed as part of a name.
// imatch has no such alias: escape every regex metacharacter for literal text.
export function literalRouteNamePattern(value: string) {
  return value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const SAVED_ROUTE_SEARCH_DEBOUNCE_MS = 300;
export const SAVED_ROUTE_QUERY_TIMEOUT_MS = 30000;
