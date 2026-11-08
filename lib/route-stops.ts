import type { LocationSelection } from './locations';

export type RouteStop = { id: string; value: string; selected?: LocationSelection | null };

export function moveStop(items: RouteStop[], id: string, direction: -1 | 1): RouteStop[] {
  const from = items.findIndex(item => item.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= items.length) return items;
  const reordered = items.slice();
  const [stop] = reordered.splice(from, 1);
  reordered.splice(to, 0, stop);
  return reordered;
}
