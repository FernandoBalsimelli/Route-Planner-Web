import React from 'react';
import { locationSearchUrl } from '@/lib/location-review';

export default function LocationSearchRecovery({ title, value }: { title: string; value: string }) {
  const href = locationSearchUrl(value);
  if (!href) return null;
  return <div className="location-search-recovery" role="region" aria-label={`Otra forma de ubicar ${title.toLowerCase()}`}>
    <strong>¿No aparece la sucursal?</strong>
    <p>Búscala en Google Maps y comprueba el nombre y la ciudad.</p>
    <a href={href} target="_blank" rel="noopener noreferrer">Buscar esta ubicación en Google Maps ↗</a>
    <small>Vuelve y pega aquí sus coordenadas o un Plus Code completo o con ciudad. Corrobora el punto y el acceso de entrega antes de confirmarlo.</small>
  </div>;
}
