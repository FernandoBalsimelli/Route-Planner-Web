import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSavedRouteTrace } from '../lib/saved-route-trace.ts';

const preferences = { avoidTolls: true, avoidHighways: false };
function fixture() {
  const points = Array.from({ length: 50 }, (_, i) => ({ label: 'Visita sintética ' + i, lat: 28.63000123 + i / 100000, lng: -106.0600456 }));
  points[2] = { ...points[1] };
  const progress = { routeId: 'synthetic-route', snapshot: 'a'.repeat(64), revision: 2, stale: false, points, completedSequences: [1, 3, 49], history: [], updatedAt: '2026-11-18T12:00:00Z' };
  const record = { mode: 'truck', preferences, polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', waypoints: points.map(p => ({ ...p, geometryIndex: 0 })), distanceMeters: 3200.5, durationSeconds: 777, privateField: 'not exposed' };
  return { record, progress };
}
test('saved trace preserves the complete ordered 50-point calculation and repeated visits without changing progress', () => {
  const { record, progress } = fixture(), before = structuredClone({ record, progress });
  const result = parseSavedRouteTrace(record, progress, progress, true, preferences);
  assert.equal(result.polyline, record.polyline); assert.equal(result.distanceMeters, 3200.5); assert.equal(result.waypoints.length, 50);
  assert.deepEqual(result.waypoints.map(p => p.sequence), Array.from({ length: 50 }, (_, i) => i));
  assert.deepEqual(result.waypoints.map(({lat,lng,label}) => ({lat,lng,label})), progress.points);
  assert.equal(result.waypoints[49].type, 'destination'); assert.equal(result.waypoints[1].type, 'stop');
  assert.equal(result.privateField, undefined); assert.equal(result.waypoints[0].geometryIndex, undefined);
  assert.deepEqual({ record, progress }, before);
});
test('a changed revision, snapshot, ordered point or operating profile cannot be shown as the reviewed trace', () => {
  for (const mutate of [s => s.progress.revision++, s => s.progress.snapshot = 'b'.repeat(64), s => s.progress.stale = true, s => s.progress.completedSequences = [1,2,3,49], s => s.record.mode = 'delivery', s => s.record.preferences = { avoidTolls: false, avoidHighways: false }, s => s.record.waypoints[2].lat += .0001, s => s.record.waypoints[2].label = 'Otro acceso', s => s.record.waypoints.reverse()]) {
    const original = fixture(), current = structuredClone(original); mutate(current);
    assert.throws(() => parseSavedRouteTrace(current.record, current.progress, original.progress, true, preferences), /cambió|corresponde/);
  }
});
test('missing, malformed, oversized geometry or incomplete points produce a specific error instead of a partial map', () => {
  for (const mutate of [s => s.record.polyline = '', s => s.record.polyline = 'invalid', s => s.record.polyline = '?'.repeat(500001), s => s.record.polyline = '??'.repeat(100001), s => s.record.waypoints.pop(), s => s.record.waypoints[0] = null, s => s.record.distanceMeters = NaN, s => s.record.durationSeconds = -1]) {
    const s = fixture(); mutate(s); assert.throws(() => parseSavedRouteTrace(s.record, s.progress, s.progress, true, preferences));
  }
});
test('legacy calculations with coordinate labels are accepted only when they match the current saved points exactly', () => {
  const s = fixture(); delete s.record.waypoints[0].label;
  s.progress.points[0].label = `${s.progress.points[0].lat}, ${s.progress.points[0].lng}`;
  assert.equal(parseSavedRouteTrace(s.record, s.progress, s.progress, true, preferences).waypoints[0].label, s.progress.points[0].label);
});
