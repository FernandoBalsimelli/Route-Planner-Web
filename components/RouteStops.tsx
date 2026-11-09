'use client';

import React from 'react';
import LocationInput from './LocationInput';
import type { Coordinates, LocationSelection } from '@/lib/locations';
import type { RouteStop } from '@/lib/route-stops';

export default function RouteStops({ stops, apiUrl, mapReference, onChange, onConfirm, onMove, onRemove, onSuggestions }: {
  stops: RouteStop[];
  apiUrl: string;
  mapReference?: Coordinates | null;
  onChange: (id: string, value: string) => void;
  onConfirm: (id: string, point: LocationSelection) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onSuggestions?: (id: string, title: string, locations: LocationSelection[]) => void;
}) {
  return <div className="route-stops-list">{stops.map((stop, index) => <div className="stop-field" key={stop.id}>
    <LocationInput title={`PARADA ${index + 1}`} color="number" value={stop.value} placeholder="Dirección, Plus Code o coordenadas" apiUrl={apiUrl} selected={stop.selected} mapReference={mapReference} onChange={value => onChange(stop.id, value)} onConfirm={point => onConfirm(stop.id, point)} onSuggestions={points => onSuggestions?.(stop.id, `PARADA ${index + 1}`, points)} />
    <div className="stop-controls" role="group" aria-label={`Orden de parada ${index + 1}`}>
      <button type="button" aria-label={`Subir parada ${index + 1}`} disabled={index === 0} onClick={() => onMove(stop.id, -1)}>↑ Subir</button>
      <button type="button" aria-label={`Bajar parada ${index + 1}`} disabled={index === stops.length - 1} onClick={() => onMove(stop.id, 1)}>↓ Bajar</button>
      <button type="button" aria-label={`Eliminar parada ${index + 1}`} onClick={() => onRemove(stop.id)}>Eliminar ×</button>
    </div>
  </div>)}</div>;
}
