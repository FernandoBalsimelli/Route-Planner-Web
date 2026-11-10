import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EMPTY_OPERATING_FORM, VEHICLE_CONFIGURATIONS, operatingInput, operatingForm, operatingSummary } from '../lib/vehicle-operating.ts';
test('unknown historical fields remain unknown and configuration catalog contains consistent axle counts', () => {
  assert.deepEqual(operatingInput(EMPTY_OPERATING_FORM), {});
  assert.deepEqual(operatingForm(null), EMPTY_OPERATING_FORM);
  assert.equal(new Set(VEHICLE_CONFIGURATIONS.map(item => item.code)).size, 23);
  for (const item of VEHICLE_CONFIGURATIONS) assert.equal(item.axles, [...item.code.matchAll(/\d/g)].reduce((total, digit) => total + Number(digit[0]), 0));
});
test('operating values round trip without rounding a municipal threshold or inferring an axle load', () => {
  const values = { configuration: 'T3-S2', axleCount: 5, payloadCapacityT: 3.499 };
  assert.deepEqual(operatingInput(operatingForm(values)), values);
  assert.equal(operatingInput({ ...EMPTY_OPERATING_FORM, payloadCapacity: '3.5' }).payloadCapacityT, 3.5);
  assert.match(operatingSummary(values), /T3-S2 · 5 ejes · Capacidad de carga 3.499 t/);
  for (const invalid of [{axleCount:'2.5'},{axleCount:'1'},{axleCount:'13'},{axleCount:'3',configuration:'T3-S2'},{configuration:'unknown'},{payloadCapacity:'3.4999'},{payloadCapacity:'0'},{payloadCapacity:'101'},{payloadCapacity:'NaN'}]) assert.throws(() => operatingInput({...EMPTY_OPERATING_FORM,...invalid}));
});
