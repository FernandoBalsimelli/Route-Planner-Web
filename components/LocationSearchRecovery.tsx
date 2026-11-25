import React from 'react';
import { locationSearchUrl } from '@/lib/location-review';

export default function LocationSearchRecovery({ title, value, compact = false }: { title: string; value: string; compact?: boolean }) {
  const href = locationSearchUrl(value);
  if (!href) return null;
  const content = <div className="location-search-recovery-content" role="region" aria-label={`Otra forma de ubicar ${title.toLowerCase()}`}>
    <p>Búscala en Google Maps y comprueba el nombre y la ciudad.</p>
    <a href={href} target="_blank" rel="noopener noreferrer">Buscar esta ubicación en Google Maps ↗</a>
    <small>Vuelve y pega aquí sus coordenadas o un Plus Code completo o con ciudad. Corrobora el punto y el acceso de entrega antes de confirmarlo.</small>
  </div>;
  return compact ? <details className="location-search-recovery"><summary>¿No es la sucursal? Buscar por otra vía</summary>{content}</details>
    : <div className="location-search-recovery"><strong>¿No aparece la sucursal?</strong>{content}</div>;
}
