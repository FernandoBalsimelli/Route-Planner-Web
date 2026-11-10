import React from 'react';
import type { RoutePreferences as Preferences } from '@/lib/route-preferences';

export default function RoutePreferences({ value, truck, onChange }: { value: Preferences; truck: boolean; onChange: (next: Preferences) => void }) {
  return <fieldset className="road-preferences">
    <legend>Preferencias de carretera</legend>
    <label><input type="checkbox" checked={value.avoidTolls} onChange={event => onChange({ ...value, avoidTolls: event.target.checked })}/><span>Evitar casetas de peaje</span></label>
    <label><input type="checkbox" checked={value.avoidHighways} onChange={event => onChange({ ...value, avoidHighways: event.target.checked })}/><span>Evitar autopistas</span></label>
    <p>Se aplican al calcular y se envían a Google Maps. Pueden alargar el recorrido; dependen de la información de cada mapa.</p>
    {truck && value.avoidHighways && <p>Para camiones, evitar autopistas puede llevar a calles urbanas con más restricciones. Revisa accesos, horarios y permisos.</p>}
    {(value.avoidTolls || value.avoidHighways) && <p>Se conserva tu orden de entregas: el optimizador disponible no aplica estas preferencias.</p>}
  </fieldset>;
}
