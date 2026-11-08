export type LocationSelection = {
  label: string;
  lat: number;
  lng: number;
  plusCode?: string;
  source?: string;
  kind?: string;
  accuracyM?: number;
  distanceMeters?: number;
};

export type Coordinates = { lat: number; lng: number };

export async function resolvePointLabel(point: Coordinates, apiUrl: string, signal: AbortSignal): Promise<{ location: LocationSelection; addressFound: boolean }> {
  const location: LocationSelection = { ...point, label: `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}` };
  try {
    const response = await fetch(`${apiUrl}/v1/locations/reverse?lat=${point.lat}&lng=${point.lng}`, { signal });
    if (response.ok) {
      const payload = await response.json();
      if (payload.ok && payload.location) {
        location.plusCode = payload.location.plusCode;
        if (typeof payload.location.label === 'string' && !payload.warning) {
          location.label = payload.location.label.slice(0, 180);
          return { location, addressFound: true };
        }
      }
    }
  } catch { /* Preserve the selected point if address lookup fails or is cancelled. */ }
  return { location, addressFound: false };
}
