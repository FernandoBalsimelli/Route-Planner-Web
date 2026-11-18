'use client';
import React from 'react';
import { deliveryPointLabel } from '@/lib/navigation-continuation';
import type { SavedRouteTrace } from '@/lib/saved-route-trace';

export default function SavedTracePointList({ points, completed, focused, onFocus, onShowAll }: { points: SavedRouteTrace['waypoints']; completed: number[]; focused: number | null; onFocus: (sequence: number) => void; onShowAll: () => void }) {
  const firstPending = points.findIndex((_, sequence) => sequence > 0 && !completed.includes(sequence));
  return <>
    <div className="saved-trace-controls"><button type="button" disabled={firstPending < 0} onClick={() => onFocus(firstPending)}>Ubicar primera pendiente</button><button type="button" disabled={focused === null} onClick={onShowAll}>Ver recorrido completo</button></div>
    <p className="saved-trace-legend">En el mapa: números originales de entrega · ✓ completado manualmente · contorno resaltado para el punto elegido. Las direcciones repetidas conservan sus visitas independientes.</p>
    <ol className="saved-trace-points" aria-label="Puntos del trazado y avance consultado">{points.map((point, sequence) => {
      const title = deliveryPointLabel(sequence, points.length), status = sequence === 0 ? 'Inicio del cálculo' : completed.includes(sequence) ? 'Completado manualmente' : 'Pendiente';
      return <li key={sequence} data-delivery-state={sequence === 0 ? 'origin' : completed.includes(sequence) ? 'completed' : 'pending'}><div><strong>{title}</strong><span>{point.label}</span><small>{status}</small></div><button type="button" aria-pressed={focused === sequence} aria-label={`Ubicar ${title.toLowerCase()} en el mapa`} onClick={() => onFocus(sequence)}>Ubicar en mapa</button></li>;
    })}</ol>
  </>;
}
