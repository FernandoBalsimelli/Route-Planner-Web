import type { LocationSelection } from './locations';
import { validLocation } from './location-book';
import { MAX_INTERMEDIATE_STOPS } from './route-limits';

type DraftPoint = { value: string; selected?: LocationSelection | null };
export function routePointIssues(origin: DraftPoint, stops: readonly DraftPoint[], destination: DraftPoint) {
  return [{ ...origin, label: 'Origen' }, ...stops.map((stop, index) => ({ ...stop, label: `PARADA ${index + 1}` })), { ...destination, label: 'Destino' }]
    .filter(point => !validLocation(point.selected) || point.selected.label !== point.value)
    .map(point => ({ label: point.label, empty: !point.value.trim() }));
}

export function confirmedRouteInputs(origin: DraftPoint, stops: readonly DraftPoint[], destination: DraftPoint) {
  const issues = routePointIssues(origin, stops, destination);
  if (issues.length) throw new Error(`Confirma todas las ubicaciones antes de calcular. Pendientes: ${issues.map(point => point.label.toLowerCase()).join(', ')}. Completa o elimina las paradas vacías.`);
  if (stops.length > MAX_INTERMEDIATE_STOPS) throw new Error(`El proveedor admite ${MAX_INTERMEDIATE_STOPS} paradas intermedias por cálculo.`);
  // Validation covers every occurrence; never filter blank/unconfirmed stops
  // or pass text to a provider that could choose the first matching branch.
  return { origin: origin.selected!, stops: stops.map(stop => stop.selected!), destination: destination.selected! };
}
