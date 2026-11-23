import { literalRouteNamePattern } from './saved-route-search';

export const FAVORITE_SEARCH_DEBOUNCE_MS = 300;
export const FAVORITE_QUERY_TIMEOUT_MS = 30000;
export const FAVORITE_PAGE_SIZE = 50;
const accents: Record<string,string> = { a:'[aáàâãäå]', e:'[eéèêë]', i:'[iíìîï]', o:'[oóòôõö]', u:'[uúùûü]', n:'[nñ]', c:'[cç]', y:'[yýÿ]' };
// Quote the regex value for PostgREST's OR grammar, independently of regex
// escaping. Supabase handles URL encoding; percent-encoding here would double it.
export function favoriteSearchFilter(value: string) {
  // Preserve the previous Spanish accent-insensitive lookup without requiring a
  // database extension. Only letters expand; punctuation/wildcards stay literal.
  const pattern = literalRouteNamePattern(value.normalize('NFD').replace(/\p{M}/gu, '')).replace(/[aeiouncy]/gi, letter => accents[letter.toLowerCase()]);
  const quoted = '"' + pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  return `name.imatch.${quoted},address_label.imatch.${quoted}`;
}
