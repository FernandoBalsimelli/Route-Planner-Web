import type { Coordinates } from './locations';

export function locationSearchUrl(value: string) {
  const query = value.trim();
  if (query.length < 2 || query.length > 180 || /[\u0000-\u001f\u007f]|https?:\/\//i.test(query)) return null;
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query })}`;
}

// Universal Maps URLs open only on an explicit click; no SDK or remote lookup.
export function locationReviewUrls(point: Coordinates) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) return null;
  const coordinates = `${point.lat},${point.lng}`;
  return {
    map: `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: coordinates })}`,
    streetView: `https://www.google.com/maps/@?${new URLSearchParams({ api: '1', map_action: 'pano', viewpoint: coordinates })}`,
  };
}
