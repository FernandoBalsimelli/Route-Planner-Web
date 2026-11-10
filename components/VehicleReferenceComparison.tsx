import React from 'react';
import { compareVehicleRule, comparisonText, type ReviewVehicle, type VehicleReferenceRule } from '@/lib/municipal-vehicle-review';
export default function VehicleReferenceComparison({ rule, vehicle }: { rule: VehicleReferenceRule; vehicle?: ReviewVehicle }) {
  const comparison = compareVehicleRule(rule, vehicle);
  if (!comparison.note && !comparison.checks.length) return null;
  return <div className="vehicle-reference-comparison" aria-label="Comparación con los datos del camión">
    {comparison.note && <p>{comparison.note}</p>}
    {comparison.checks.map(check => <p key={check.label} data-comparison={check.result}>{comparisonText(check)}</p>)}
  </div>;
}
