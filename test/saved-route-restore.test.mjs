import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readSavedRoutePoints, savedCalculationMatchesPoints } from '../lib/saved-route-restore.ts';
const point = (label, lat = 28.630001234) => ({ label, lat, lng: -106.060045678 });
const origin = point('Origen'), destination = point('Destino', 28.64);
const rows = Array.from({ length: 48 }, (_, i) => ({ sequence: i + 1, location: point('Visita ' + (i + 1), 28.631 + i / 100000) }));
rows[1].location = { ...rows[0].location };
const calculation = points => ({ waypoints: [points.origin, ...points.stops, points.destination].map((p, i, list) => ({ ...p.selected, type: i === 0 ? 'origin' : i === list.length - 1 ? 'destination' : 'stop' })) });

test('restoring retains all 50 exact ordered occurrences and repeated addresses without mutating stored data', () => {
  const before = JSON.stringify(rows), draft = readSavedRoutePoints(origin, destination, rows), result = calculation(draft);
  assert.equal(draft.stops.length, 48); assert.deepEqual(draft.stops[0], draft.stops[1]);
  assert.equal(savedCalculationMatchesPoints(result, draft), true); assert.equal(JSON.stringify(rows), before);
  assert.equal(draft.stops[0].selected.lng, -106.060045678);
  assert.equal(savedCalculationMatchesPoints(calculation(readSavedRoutePoints(origin, destination, [])), readSavedRoutePoints(origin, destination, [])), true);
});

test('a corrected access, label, order, count or endpoint invalidates the historical calculation entirely', () => {
  const original = readSavedRoutePoints(origin, destination, rows), result = calculation(original);
  for (const change of [p => { p.stops[1].selected.lat += 0.000000001; }, p => { p.stops[1].selected.label = 'Otra entrada'; }, p => { [p.stops[2], p.stops[3]] = [p.stops[3], p.stops[2]]; }, p => { p.stops.pop(); }, p => { p.destination.selected.lng -= 0.000000001; }]) {
    const draft = structuredClone(original); change(draft); assert.equal(savedCalculationMatchesPoints(result, draft), false);
  }
  assert.equal(savedCalculationMatchesPoints(undefined, original), false);
  assert.equal(savedCalculationMatchesPoints({ waypoints: [null, ...result.waypoints.slice(1)] }, original), false);
});

test('missing, noncontiguous, duplicate, unordered or oversized rows fail before returning a partial draft', () => {
  for (const invalid of [null, {}, [rows[0], rows[2]], [rows[0], rows[0]], [rows[1], rows[0]], [undefined], [{ sequence: 1, location: null }], [...rows, { sequence: 49, location: origin }]]) assert.throws(() => readSavedRoutePoints(origin, destination, invalid));
  assert.throws(() => readSavedRoutePoints(null, destination, rows));
  const legacy = readSavedRoutePoints(origin, destination, rows.map((r, i) => ({ ...r, sequence: i })));
  assert.equal(legacy.stops.length, 48, 'legacy contiguous zero-based numbering is preserved');
});

test('legacy address-only points stay editable but cannot validate an old calculation; numeric coordinates are never coerced', () => {
  const draft = readSavedRoutePoints({ label: 'Dirección sin coordenadas', lat: '28.63', lng: -106 }, destination, []);
  assert.equal(draft.origin.value, 'Dirección sin coordenadas'); assert.equal(draft.origin.selected, null);
  assert.equal(savedCalculationMatchesPoints({ waypoints: [{ ...origin, type: 'origin' }, { ...destination, type: 'destination' }] }, draft), false);
  const coordinates = readSavedRoutePoints({ lat: 0, lng: 0 }, destination, []);
  assert.equal(coordinates.origin.value, '0, 0'); assert.equal(savedCalculationMatchesPoints(calculation(coordinates), coordinates), true);
});
