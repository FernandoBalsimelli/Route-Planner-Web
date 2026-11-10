import React from 'react';
import { VEHICLE_CONFIGURATIONS, type VehicleOperatingForm } from '@/lib/vehicle-operating';
export default function VehicleOperatingFields({ value, onChange }: { value: VehicleOperatingForm; onChange: (next: VehicleOperatingForm) => void }) {
  return <fieldset className="vehicle-operating-fields"><legend>Configuración y carga (opcional)</legend>
    <div className="vehicle-fields">
      <label>Configuración vehicular<select aria-label="Configuración vehicular" value={value.configuration} onChange={event => {
        const configuration = event.target.value, entry = VEHICLE_CONFIGURATIONS.find(item => item.code === configuration);
        onChange({ ...value, configuration, axleCount: entry ? String(entry.axles) : value.axleCount });
      }}><option value="">Sin identificar / otra configuración</option>{VEHICLE_CONFIGURATIONS.map(item => <option key={item.code} value={item.code}>{item.code} · {item.axles} ejes</option>)}</select></label>
      <label>Número total de ejes<input type="number" min="2" max="12" step="1" value={value.axleCount} readOnly={Boolean(value.configuration)} onChange={event => onChange({ ...value, axleCount: event.target.value })}/></label>
      <label>Capacidad máxima de carga (t)<input type="number" min="0.001" max="100" step="0.001" value={value.payloadCapacity} onChange={event => onChange({ ...value, payloadCapacity: event.target.value })}/></label>
    </div>
    <p className="hint">Elige la configuración para completar los ejes. Usa la capacidad de carga de la documentación de la unidad; es distinta del peso bruto cargado.</p>
    <p className="hint">Estos datos se conservan para revisar normas. El proveedor de rutas no recibe configuración, número de ejes ni capacidad de carga; no acreditan autorización para circular.</p>
  </fieldset>;
}
