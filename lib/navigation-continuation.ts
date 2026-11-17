import type { NavigationPoint } from './navigation';
import type { GoogleGuidePoint } from './google-route-guides';

export function deliveryPointLabel(index: number, total: number): string {
  return index === 0 ? 'Origen' : index === total - 1 ? 'Destino' : `Entrega ${index}`;
}

// Select by the provider's original waypoint occurrence, never by proximity,
// coordinates or display text: two deliveries can have the very same address.
export function remainingNavigationPoints(points: NavigationPoint[], startIndex: number, guides?: GoogleGuidePoint[] | null): { points: NavigationPoint[]; guideCount: number } {
  if (!Number.isSafeInteger(startIndex) || startIndex < 0 || startIndex >= points.length - 1) throw new Error('Elige un origen o una entrega anterior al destino para retomar.');
  if (guides) {
    const occurrences = guides.filter(point => point.waypointIndex !== undefined);
    if (occurrences.length !== points.length || occurrences.some((value, index) => {
      const original = points[index];
      return value.waypointIndex !== index || !original || typeof original !== 'object' || original.lat !== value.lat || original.lng !== value.lng;
    })) throw new Error('No se pudieron asociar todos los puntos guía con tus entregas. Recalcula el recorrido.');
    const position = guides.findIndex(point => point.waypointIndex === startIndex);
    const remaining = guides.slice(position);
    return { points: remaining, guideCount: remaining.filter(point => point.waypointIndex === undefined).length };
  }
  return { points: points.slice(startIndex).map((point, offset) => typeof point === 'object' && point ? { ...point, navigationLabel: deliveryPointLabel(startIndex + offset, points.length) } : point), guideCount: 0 };
}
