type MapsPaste = { type: 'search'; query: string } | { type: 'unsupported'; message: string };
const hosts = new Set(['google.com', 'www.google.com', 'maps.google.com', 'google.com.mx', 'www.google.com.mx', 'maps.google.com.mx']);
const help = 'Abre el lugar en Google Maps y copia sus coordenadas, Plus Code o dirección completa. El centro de la vista y un enlace de ruta no identifican por sí solos el acceso de entrega.';

// Read text only. Never resolve short links, redirects or place IDs, and never
// infer a selected place from @, center, ll or a Street View viewpoint.
export function mapsLocationPaste(text: string): MapsPaste | null {
  const trimmed = text.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  let url: URL;
  try { url = new URL(trimmed); } catch { return null; }
  const short = url.hostname === 'maps.app.goo.gl' || (url.hostname === 'goo.gl' && url.pathname.startsWith('/maps'));
  if (!short && !hosts.has(url.hostname)) return null;
  if (!short && !/^\/maps(?:\/|$)/.test(url.pathname) && url.hostname !== 'maps.google.com' && url.hostname !== 'maps.google.com.mx') return null;
  if (short || trimmed.length > 12000 || url.username || url.password || url.port || url.protocol !== 'https:') return { type: 'unsupported', message: help };
  const params = url.searchParams;
  const searchPath = /^\/maps(?:\/search)?\/?$/.test(url.pathname) || (url.hostname.startsWith('maps.google.') && url.pathname === '/');
  if (!searchPath || ['origin', 'destination', 'waypoints', 'map_action', 'viewpoint', 'query_place_id', 'place_id', 'cid', 'ftid'].some(key => params.has(key)) || (params.has('query') && params.get('api') !== '1')) return { type: 'unsupported', message: help };
  const queries = [...params.getAll('query'), ...params.getAll('q')];
  if (queries.length !== 1) return { type: 'unsupported', message: help };
  const query = queries[0].trim();
  if (!query || query.length > 180 || /[\u0000-\u001f\u007f]|https?:\/\//i.test(query)) return { type: 'unsupported', message: help };
  // A coordinate-bearing query is separate from the URL's camera position.
  // A text query remains a search, not an imported pin or verified business.
  const coordinates = query.match(/^([+-]?\d{1,2}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)$/);
  if (coordinates) {
    if (Math.abs(Number(coordinates[1])) > 90 || Math.abs(Number(coordinates[2])) > 180) return { type: 'unsupported', message: help };
    return { type: 'search', query: `${coordinates[1].replace(/^\+/, '')},${coordinates[2].replace(/^\+/, '')}` };
  }
  return { type: 'search', query };
}
