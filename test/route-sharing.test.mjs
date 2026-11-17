import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSharedRoute, shareTokenFromHash, validShareToken } from '../lib/route-sharing.ts';
const point = { label: 'Synthetic public point', lat: 25.67000123, lng: -100.3000456 };
const vehicle = { heightM: 4.1, widthM: 2.5, lengthM: 18, grossWeightT: 38, axleWeightT: 9, axleCount: 5, configuration: 'T3-S2', payloadCapacityT: 30.125 };
const response = () => ({ expiresAt: '2026-11-18T10:00:00Z', draft: { schemaVersion: 1, name: 'Synthetic shared route', mode: 'truck', origin: point, destination: point, stops: Array.from({ length: 48 }, (_, i) => ({ ...point, label: `Delivery ${i + 1}` })), vehicle, preferences: { avoidTolls: true, avoidHighways: false } } });
test('share tokens are accepted only as an exact 64 hex fragment with no suffix or decoding', () => {
  const token = 'a1'.repeat(32);
  assert.equal(shareTokenFromHash('#compartir=' + token), token);
  for (const value of [token + 'x', token.toUpperCase(), token + '&owner=alice', '%61' + token.slice(1), '', 'x'.repeat(64)]) { assert.equal(validShareToken(value), false); assert.equal(shareTokenFromHash('#compartir=' + value), ''); }
  assert.equal(shareTokenFromHash('#mis-rutas'), null);
});
test('a shared draft keeps all 50 ordered points and numeric precision without copying private fields or computed data', () => {
  const input = response(); input.draft.owner_id = 'private'; input.draft.vehicle_id = 'private'; input.draft.result = { polyline: 'private', regulatoryCoverage: { status: 'private' } };
  input.draft.origin = { ...point, ownerEmail: 'private' }; input.draft.vehicle = { ...vehicle, id: 'private' };
  const result = parseSharedRoute(input);
  assert.equal(result.draft.stops.length, 48); assert.equal(result.draft.stops[47].label, 'Delivery 48');
  assert.equal(result.draft.origin.lat, point.lat); assert.deepEqual(result.draft.vehicle, vehicle); assert.deepEqual(result.draft.preferences, input.draft.preferences);
  assert.equal(JSON.stringify(result).includes('private'), false);
});
test('malformed or oversized shared drafts fail entirely without truncating or inventing truck defaults', () => {
  for (const change of [d => d.stops.push(point), d => d.origin = { ...point, lat: NaN }, d => d.destination = { ...point, lng: 181 }, d => d.stops[47] = { ...point, label: '' }, d => d.vehicle = null, d => delete d.vehicle.heightM, d => d.vehicle.axleCount = 3, d => d.vehicle.configuration = 'unknown', d => d.vehicle.payloadCapacityT = 30.1234, d => d.vehicle.axleCount = '5', d => d.preferences.avoidTolls = 'true', d => d.mode = 'unknown', d => d.name = 'x'.repeat(121), d => d.schemaVersion = 2]) {
    const input = structuredClone(response()); change(input.draft); assert.throws(() => parseSharedRoute(input));
  }
  assert.throws(() => parseSharedRoute(null)); assert.throws(() => parseSharedRoute({ ...response(), expiresAt: 'invalid' }));
});
test('delivery drafts contain no inherited truck profile and allow two endpoints without intermediate stops', () => {
  const input = response(); input.draft.mode = 'delivery'; input.draft.stops = [];
  const result = parseSharedRoute(input); assert.equal(result.draft.vehicle, null); assert.equal(result.draft.stops.length, 0);
});
