import assert from 'node:assert/strict';
import { test } from 'node:test';
import { googleMapsUrls } from '../lib/navigation.ts';

test('navigation uses confirmed coordinates in the requested order, not ambiguous labels', () => {
  const points = [{ label: 'Mismo nombre', lat: 28.661234567, lng: -106.09 }, { lat: 28.67, lng: -106.10 }, { lat: 28.68, lng: -106.11 }];
  const links = googleMapsUrls(points);
  const url = new URL(links[0]);
  assert.equal(url.searchParams.get('origin'), '28.661234567, -106.09');
  assert.equal(url.searchParams.get('waypoints'), '28.67, -106.1');
  assert.equal(url.searchParams.get('destination'), '28.68, -106.11');
  assert.equal(url.searchParams.get('api'), '1');
  assert.ok(!links[0].includes('Mismo'));
});

test('navigation supports typed addresses and requires two valid points', () => {
  assert.deepEqual(googleMapsUrls(['', 'Chihuahua', null]), []);
  assert.equal(new URL(googleMapsUrls(['Chihuahua', 'Ciudad Juárez'])[0]).searchParams.get('destination'), 'Ciudad Juárez');
  assert.deepEqual(googleMapsUrls([{ lat: NaN, lng: 0 }, 'Chihuahua']), []);
});

test('long itineraries preserve every stop across consecutive mobile-compatible segments', () => {
  const points = Array.from({ length: 10 }, (_, i) => ({ lat: 28 + i / 100, lng: -106 }));
  const links = googleMapsUrls(points).map(link => new URL(link));
  assert.equal(links.length, 3);
  const visited = [];
  for (const [index, link] of links.entries()) {
    const stops = link.searchParams.get('waypoints')?.split('|') || [];
    assert.ok(stops.length <= 3);
    const segment = [link.searchParams.get('origin'), ...stops, link.searchParams.get('destination')];
    if (index) assert.equal(segment[0], visited.at(-1));
    visited.push(...segment.slice(index ? 1 : 0));
  }
  assert.deepEqual(visited, points.map(p => `${p.lat}, ${p.lng}`));
});
