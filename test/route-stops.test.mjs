import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moveStop } from '../lib/route-stops.ts';

const points = [
  { id: 'a', value: 'Primera', selected: { label: 'Primera', lat: 28.66, lng: -106.09 } },
  { id: 'b', value: 'Segunda', selected: { label: 'Segunda', lat: 28.67, lng: -106.10 } },
  { id: 'c', value: 'Tercera', selected: { label: 'Tercera', lat: 28.68, lng: -106.11 } },
];

test('moving a stop keeps its confirmed coordinates and does not mutate the route', () => {
  const reordered = moveStop(points, 'b', -1);
  assert.deepEqual(reordered.map(p => p.id), ['b', 'a', 'c']);
  assert.equal(reordered[0].selected, points[1].selected);
  assert.deepEqual(points.map(p => p.id), ['a', 'b', 'c']);
  assert.deepEqual(moveStop(reordered, 'b', 1).map(p => p.id), ['a', 'b', 'c']);
});

test('boundary moves, unknown stops and empty routes preserve the input', () => {
  assert.equal(moveStop(points, 'a', -1), points);
  assert.equal(moveStop(points, 'c', 1), points);
  assert.equal(moveStop(points, 'missing', 1), points);
  const empty = [];
  assert.equal(moveStop(empty, 'a', 1), empty);
});
