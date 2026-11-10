import assert from 'node:assert/strict';
import { test } from 'node:test';
import { googleMapsUrls, googleMapsSegments } from '../lib/navigation.ts';

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
  const links = googleMapsUrls(points, 3).map(link => new URL(link));
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


for (const limit of [3,9]) test(`50 points retain order and shared endpoints with ${limit} intermediate stops per Google link`,()=>{
  const points=Array.from({length:50},(_,i)=>({lat:28+i/1000,lng:-106.123456789}));
  const segments=googleMapsSegments(points,limit);
  assert.equal(segments.length,Math.ceil(49/(limit+1)));
  const visited=[];
  for(const [index,segment] of segments.entries()){
    assert.ok(segment.url.length<=2048);
    const params=new URL(segment.url).searchParams;
    const stops=params.get('waypoints')?.split('|')||[];
    assert.ok(stops.length<=limit);
    const part=[params.get('origin'),...stops,params.get('destination')];
    if(index) assert.equal(part[0],visited.at(-1));
    assert.equal(segment.startIndex,index ? segments[index-1].endIndex : 0);
    visited.push(...part.slice(index?1:0));
  }
  assert.deepEqual(visited,points.map(p=>`${p.lat}, ${p.lng}`));
});

test('encoded long addresses split before Google URL length is exceeded without losing points',()=>{
  const points=Array.from({length:20},(_,i)=>`Sucursal ${i} · ${'Árbol '.repeat(23)}Chihuahua`);
  const segments=googleMapsSegments(points);
  assert.ok(segments.length>2);
  const visited=[];
  for(const [index,segment] of segments.entries()){
    assert.ok(segment.url.length<=2048);
    const p=new URL(segment.url).searchParams;
    const part=[p.get('origin'),...(p.get('waypoints')?.split('|')||[]),p.get('destination')];
    visited.push(...part.slice(index?1:0));
  }
  assert.deepEqual(visited,points);
});

test('an unrepresentable pair asks for confirmation instead of emitting an oversized link',()=>{
  assert.throws(()=>googleMapsSegments(['漢'.repeat(180),'字'.repeat(180)]),/Confirma estos puntos/);
});


for (const limit of [3, 9]) test(`road preferences accompany every Google segment including long addresses (${limit})`, () => {
  const points = Array.from({ length: 50 }, (_, i) => `Entrega ${i} · ${'Árbol '.repeat(12)}Chihuahua`);
  const segments = googleMapsSegments(points, limit, { avoidTolls: true, avoidHighways: true });
  const visited = [];
  for (const [index, segment] of segments.entries()) {
    assert.ok(segment.url.length <= 2048);
    const params = new URL(segment.url).searchParams;
    assert.equal(params.get('avoid'), 'tolls,highways');
    const part = [params.get('origin'), ...(params.get('waypoints')?.split('|') || []), params.get('destination')];
    if (index) assert.equal(part[0], visited.at(-1));
    visited.push(...part.slice(index ? 1 : 0));
  }
  assert.deepEqual(visited, points);
  assert.equal(new URL(googleMapsUrls(['A', 'B'])[0]).searchParams.has('avoid'), false);
});


test('legacy or malformed saved preferences never enable unrecorded exclusions', async () => {
  const { readRoutePreferences } = await import('../lib/route-preferences.ts');
  for (const value of [undefined, null, {}, { avoidTolls: 'true', avoidHighways: 1 }]) assert.deepEqual(readRoutePreferences(value), { avoidTolls: false, avoidHighways: false });
  assert.deepEqual(readRoutePreferences({ avoidTolls: true }), { avoidTolls: true, avoidHighways: false });
});
