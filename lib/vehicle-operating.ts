import catalog from '@/data/vehicle-configurations.json';
export const VEHICLE_CONFIGURATIONS = catalog.configurations;
export type VehicleOperatingInput = { axleCount?: number; configuration?: string; payloadCapacityT?: number };
export type VehicleOperatingForm = { axleCount: string; configuration: string; payloadCapacity: string };
export const EMPTY_OPERATING_FORM: VehicleOperatingForm = { axleCount: '', configuration: '', payloadCapacity: '' };
export function operatingForm(input?: VehicleOperatingInput | null): VehicleOperatingForm {
  return { axleCount: input?.axleCount != null ? String(input.axleCount) : '', configuration: input?.configuration || '', payloadCapacity: input?.payloadCapacityT != null ? String(input.payloadCapacityT) : '' };
}
export function operatingInput(form: VehicleOperatingForm): VehicleOperatingInput {
  const result: VehicleOperatingInput = {};
  if (form.axleCount.trim()) {
    const value = Number(form.axleCount);
    if (!Number.isInteger(value) || value < 2 || value > 12) throw new Error('El número de ejes debe ser un entero entre 2 y 12.');
    result.axleCount = value;
  }
  if (form.configuration) {
    const entry = VEHICLE_CONFIGURATIONS.find(item => item.code === form.configuration);
    if (!entry || result.axleCount !== entry.axles) throw new Error('Revisa la configuración y su número de ejes.');
    result.configuration = entry.code;
  }
  if (form.payloadCapacity.trim()) {
    const value = Number(form.payloadCapacity);
    if (!Number.isFinite(value) || value <= 0 || value > 100 || Math.abs(value * 1000 - Math.round(value * 1000)) > 1e-8) throw new Error('La capacidad de carga debe ser mayor que 0, hasta 100 t y con un máximo de tres decimales.');
    result.payloadCapacityT = value;
  }
  return result;
}
export function operatingSummary(input?: VehicleOperatingInput | null): string {
  return [input?.configuration, input?.axleCount != null && `${input.axleCount} ejes`, input?.payloadCapacityT != null && `Capacidad de carga ${input.payloadCapacityT} t`].filter(Boolean).join(' · ');
}
