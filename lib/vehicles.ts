export type VehicleProfile = {
  id: string; name: string; fleet_id: string | null; vehicle_type: 'delivery' | 'car' | 'truck';
  height_m: number | null; width_m: number | null; length_m: number | null; gross_weight_t: number | null; axle_weight_t: number | null;
};
export const VEHICLE_COLUMNS = 'id,name,fleet_id,vehicle_type,height_m,width_m,length_m,gross_weight_t,axle_weight_t';
export const dimensionFields = [
  { key: 'height_m', title: 'Altura total (m)', max: 10 },
  { key: 'width_m', title: 'Ancho (m)', max: 5 },
  { key: 'length_m', title: 'Largo (m)', max: 30 },
  { key: 'gross_weight_t', title: 'Peso bruto cargado (t)', max: 100 },
  { key: 'axle_weight_t', title: 'Peso máximo por eje (t)', max: 30 },
] as const;
export function vehicleValues(name: string, type: VehicleProfile['vehicle_type'], dimensions: Record<string, string>, fleetId: string) {
  if (!name.trim() || name.trim().length > 120) throw new Error('Escribe un nombre de hasta 120 caracteres para identificar el vehículo.');
  const values: Record<string, number | null> = {};
  for (const field of dimensionFields) {
    const value = Number(dimensions[field.key]);
    if (type === 'truck' && (!dimensions[field.key]?.trim() || !Number.isFinite(value) || value <= 0 || value > field.max)) throw new Error(`Revisa ${field.title.toLowerCase()}: debe ser mayor que 0 y no superar ${field.max}.`);
    values[field.key] = type === 'truck' ? value : null;
  }
  return { name: name.trim(), vehicle_type: type, fleet_id: fleetId || null, ...values };
}
