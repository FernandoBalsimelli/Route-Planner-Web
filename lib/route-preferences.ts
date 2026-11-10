export type RoutePreferences = { avoidTolls: boolean; avoidHighways: boolean };
export const DEFAULT_ROUTE_PREFERENCES: RoutePreferences = { avoidTolls: false, avoidHighways: false };
// Older routes have no preferences; never infer restrictions from their name.
export function readRoutePreferences(value: unknown): RoutePreferences {
  const input = value && typeof value === 'object' ? value as Partial<RoutePreferences> : {};
  return { avoidTolls: input.avoidTolls === true, avoidHighways: input.avoidHighways === true };
}
export function hasRoadPreferences(value: RoutePreferences): boolean { return value.avoidTolls || value.avoidHighways; }
export function roadPreferencesLabel(value: RoutePreferences): string {
  return [value.avoidTolls && 'Evitar peajes', value.avoidHighways && 'Evitar autopistas'].filter(Boolean).join(' · ');
}
