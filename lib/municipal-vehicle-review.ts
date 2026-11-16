import { VEHICLE_CONFIGURATIONS, type VehicleOperatingInput } from './vehicle-operating';
export type ReviewVehicle = VehicleOperatingInput & { heightM?: number; widthM?: number; lengthM?: number; grossWeightT?: number; axleWeightT?: number };
export type VehicleReferenceRule = {
  vehicleConditions?: { payloadCapacityT?: { lt?: number; lte?: number; gt?: number } };
  vehicleConfigurations?: string[];
  limits?: Record<string, number>;
  lengthWithoutSpecialAuthorizationM?: number;
};
export type VehicleComparison = { label: string; value?: number; reference: string; result: 'unknown' | 'within' | 'above' | 'matches' | 'differs' | 'boundary'; unit: string };
export type RuleComparison = { note?: string; checks: VehicleComparison[] };
const fields = {
  grossWeightT: { label: 'Peso bruto cargado', unit: 't', maximum: 100 },
  lengthM: { label: 'Largo', unit: 'm', maximum: 30 },
  widthM: { label: 'Ancho del vehículo', unit: 'm', maximum: 5 },
  heightM: { label: 'Altura', unit: 'm', maximum: 10 },
  loadWidthM: { label: 'Ancho de la carga', unit: 'm', maximum: 5 },
} as const;
function positive(value: unknown, maximum: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= maximum ? value : undefined;
}
function capacity(value: unknown): number | undefined {
  const number = positive(value, 100);
  return number !== undefined && Number(number.toFixed(3)) === number ? number : undefined;
}
export function reviewedVehicle(input?: ReviewVehicle): ReviewVehicle | undefined {
  if (!input) return undefined;
  const count = input.axleCount;
  const validCount = typeof count === 'number' && Number.isInteger(count) && count >= 2 && count <= 12 ? count : undefined;
  const config = input.configuration ? VEHICLE_CONFIGURATIONS.find(item => item.code === input.configuration && item.axles === validCount) : undefined;
  return {
    heightM: positive(input.heightM, 10), widthM: positive(input.widthM, 5), lengthM: positive(input.lengthM, 30), grossWeightT: positive(input.grossWeightT, 100),
    payloadCapacityT: capacity(input.payloadCapacityT),
    axleCount: input.configuration && !config ? undefined : validCount,
    configuration: config?.code,
  };
}
export function compareVehicleRule(rule: VehicleReferenceRule, vehicle?: ReviewVehicle): RuleComparison {
  vehicle = reviewedVehicle(vehicle);
  const checks: VehicleComparison[] = [];
  const condition = rule.vehicleConditions?.payloadCapacityT;
  if (condition) {
    const operators = (['lt', 'lte', 'gt'] as const).filter(key => condition[key] !== undefined);
    if (operators.length !== 1) return { checks, note: 'Comparador de la fuente pendiente de revisión.' };
    const operator = operators[0];
    const limit = condition[operator]!;
    if (!Number.isFinite(limit) || limit <= 0) return { checks, note: 'Comparador de la fuente pendiente de revisión.' };
    const value = capacity(vehicle?.payloadCapacityT);
    const reference = operator === 'lte' ? `hasta ${limit} t` : `${operator === 'lt' ? 'menor' : 'mayor'} que ${limit} t`;
    const matches = value !== undefined && (operator === 'lt' ? value < limit : operator === 'lte' ? value <= limit : value > limit);
    checks.push({ label: 'Capacidad de carga', value, unit: 't', reference, result: value === undefined ? 'unknown' : value === limit && operator !== 'lte' ? 'boundary' : matches ? 'matches' : 'differs' });
  }
  if (rule.limits) {
    if (rule.vehicleConfigurations?.length && !rule.vehicleConfigurations.includes(vehicle?.configuration || '')) return {
      checks,
      note: vehicle?.configuration ? `El cuadro citado describe ${rule.vehicleConfigurations.join(', ')}; no se evalúa tu configuración ${vehicle.configuration} con esos límites.` : `Falta identificar la configuración; el cuadro citado describe ${rule.vehicleConfigurations.join(', ')}.`,
    };
    for (const [key, field] of Object.entries(fields)) {
      const limit = rule.limits[key];
      if (!Number.isFinite(limit) || limit <= 0) continue;
      // Load width is a separate datum; never substitute the vehicle's width.
      const value = key === 'loadWidthM' ? undefined : positive(vehicle?.[key as keyof ReviewVehicle], field.maximum);
      checks.push({ label: field.label, value, unit: field.unit, reference: `máximo citado ${limit} ${field.unit}`, result: value === undefined ? 'unknown' : value > limit ? 'above' : 'within' });
    }
  }
  const length = rule.lengthWithoutSpecialAuthorizationM;
  if (typeof length === 'number' && Number.isFinite(length) && length > 0) {
    const value = positive(vehicle?.lengthM, 30);
    checks.push({ label: 'Largo', value, unit: 'm', reference: `umbral de autorización citado ${length} m`, result: value === undefined ? 'unknown' : value > length ? 'above' : 'within' });
  }
  return { checks };
}
export function axleReferenceComparison(maximum: number, vehicle?: ReviewVehicle): VehicleComparison | null {
  if (!Number.isInteger(maximum) || maximum < 2 || maximum > 12) return null;
  const value = reviewedVehicle(vehicle)?.axleCount;
  const valid = typeof value === 'number' && Number.isInteger(value) && value >= 2 && value <= 12 ? value : undefined;
  return { label: 'Número total de ejes', value: valid, unit: 'ejes', reference: `hasta ${maximum} ejes en el criterio citado`, result: valid === undefined ? 'unknown' : valid <= maximum ? 'matches' : 'differs' };
}
export function comparisonText(check: VehicleComparison): string {
  const value = check.value === undefined ? 'sin dato válido' : `${check.value} ${check.unit}`;
  const outcome = {
    unknown: 'dato pendiente', within: 'no supera el valor citado', above: 'supera el valor citado',
    matches: 'coincide sólo este dato', differs: 'no coincide este dato', boundary: 'igual al umbral: no se asigna una ventana',
  }[check.result];
  return `${check.label}: ${value} · ${check.reference} · ${outcome}.`;
}
