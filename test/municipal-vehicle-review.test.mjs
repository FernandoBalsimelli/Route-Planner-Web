import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareVehicleRule, axleReferenceComparison, comparisonText, reviewedVehicle } from '../lib/municipal-vehicle-review.ts';
const low = { vehicleConditions: { payloadCapacityT: { lt: 3.5 } } };
const high = { vehicleConditions: { payloadCapacityT: { gt: 3.5 } } };
const dimensions = { vehicleConfigurations: ['C2'], limits: { grossWeightT: 13, lengthM: 12.5, widthM: 2.6, heightM: 4.25, loadWidthM: 2.6 } };
test('strict capacity comparisons preserve the 3.5 boundary without substituting gross weight', () => {
  for (const [value, lower, higher] of [[3.499,'matches','differs'],[3.5,'boundary','boundary'],[3.501,'differs','matches']]) {
    assert.equal(compareVehicleRule(low,{payloadCapacityT:value,grossWeightT:38}).checks[0].result,lower);
    assert.equal(compareVehicleRule(high,{payloadCapacityT:value,grossWeightT:1}).checks[0].result,higher);
  }
  assert.equal(compareVehicleRule(low,{grossWeightT:3}).checks[0].result,'unknown');
  assert.match(comparisonText(compareVehicleRule(low,{payloadCapacityT:3.5}).checks[0]),/no se asigna una ventana/);
});
test('unknown or invalid operating inputs do not become inferred exemptions or rounded capacity', () => {
  for (const payloadCapacityT of [undefined,NaN,Infinity,0,-1,3.4999,3.4999999999999996,3.5000000000000004,101]) assert.equal(compareVehicleRule(low,{payloadCapacityT}).checks[0].result,'unknown');
  for (const axleCount of [undefined,NaN,0,1,2.5,13]) assert.equal(axleReferenceComparison(4,{axleCount}).result,'unknown');
  assert.equal(axleReferenceComparison(4,{axleCount:2,configuration:'T3-S2'}).result,'unknown');
  assert.equal(axleReferenceComparison(4,{configuration:'C2'}).result,'unknown');
  assert.equal(axleReferenceComparison(4,{axleCount:2,configuration:'unknown'}).result,'unknown');
  assert.equal(reviewedVehicle({payloadCapacityT:NaN,axleCount:NaN}).payloadCapacityT,undefined);
});
test('dimensional references compare only their stated configuration and keep load width unknown', () => {
  assert.equal(compareVehicleRule(dimensions,{configuration:'T3-S2',axleCount:5,grossWeightT:12}).checks.length,0);
  assert.match(compareVehicleRule(dimensions,{}).note,/Falta identificar/);
  const values={configuration:'C2',axleCount:2,grossWeightT:13,lengthM:12.6,widthM:2.6,heightM:4.2};
  const checks=compareVehicleRule(dimensions,values).checks;
  assert.deepEqual(checks.map(x=>x.result),['within','above','within','within','unknown']);
  assert.equal(checks.at(-1).label,'Ancho de la carga');
  assert.equal(compareVehicleRule(dimensions,{...values,axleCount:3}).checks.length,0);
});
test('length thresholds and axle criteria never produce a legal authorization status', () => {
  const rule={lengthWithoutSpecialAuthorizationM:11};
  assert.equal(compareVehicleRule(rule,{lengthM:11}).checks[0].result,'within');
  assert.equal(compareVehicleRule(rule,{lengthM:11.001}).checks[0].result,'above');
  assert.equal(compareVehicleRule(rule,{}).checks[0].result,'unknown');
  for (const [axleCount,result] of [[2,'matches'],[4,'matches'],[5,'differs']]) assert.equal(axleReferenceComparison(4,{axleCount}).result,result);
  assert.equal(axleReferenceComparison(1,{}),null);
  assert.deepEqual(compareVehicleRule({}),{checks:[]});
  assert.match(compareVehicleRule({vehicleConditions:{payloadCapacityT:{gt:3.5,lt:4}}},{payloadCapacityT:3.7}).note,/pendiente/);
});
