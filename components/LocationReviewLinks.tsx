import React from 'react';
import { locationReviewUrls } from '@/lib/location-review';
import type { Coordinates } from '@/lib/locations';

export default function LocationReviewLinks({ point, mapLabel = 'Ver mapa' }: { point: Coordinates; mapLabel?: string }) {
  const urls = locationReviewUrls(point);
  if (!urls) return null;
  return <div className="location-review-links">
    <div><a href={urls.map} target="_blank" rel="noopener noreferrer">{mapLabel} ↗</a><a href={urls.streetView} target="_blank" rel="noopener noreferrer">Ver entorno en Street View ↗</a></div>
    <small>Abre Google al pulsar. Street View puede mostrar imágenes antiguas o un punto cercano; puede no haber cobertura. Corrobora la entrada de descarga y la señalización actual. La imagen no acredita acceso ni permiso para el camión.</small>
  </div>;
}
