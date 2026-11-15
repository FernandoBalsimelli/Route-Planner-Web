import assert from 'node:assert/strict';
import { test } from 'node:test';
import { manifestCandidates } from '../lib/manifest.ts';
import { nearbyManifestLocations, repeatedManifestLines } from '../lib/manifest-review.ts';

test('manifest preserves repeated orders, their positions and more than eight deliveries', () => {
  const address='Bodega Aurrera Express, Calle Cedro 312, Chihuahua';
  const values=[address,'Calle Diferente 42, Chihuahua',...Array(47).fill(address)];
  assert.deepEqual(manifestCandidates(values.join('\n')),values);
  assert.deepEqual(repeatedManifestLines([' Calle UNO 12 ','Otra', 'calle   uno 12','']),[[1,3]]);
  assert.equal(repeatedManifestLines(values)[0].length,48);
});

const row=(value,lat,lng,extra={})=>({enabled:true,value,selected:{label:value,lat,lng},...extra});
test('nearby review uses confirmed coordinates rather than matching business names', () => {
  const rows=[row('Express centro',28.63,-106.07),row('Otra etiqueta',28.63004,-106.07),row('Express centro',28.64,-106.07)];
  const result=nearbyManifestLocations(rows);assert.equal(result.length,1);assert.equal(result[0].first,1);assert.equal(result[0].second,2);assert.ok(result[0].distanceMeters>4&&result[0].distanceMeters<5);
  assert.deepEqual(rows.map(r=>r.value),['Express centro','Otra etiqueta','Express centro']);
});

test('excluded, unconfirmed, stale or invalid points never become a nearby warning and row numbers do not shift', () => {
  const rows=[row('Same',0,0),row('excluded',0,0,{enabled:false}),row('not confirmed',0,0,{selected:null}),row('edited',0,0,{selected:{label:'old',lat:0,lng:0}}),row('bad',NaN,0),row('bad range',91,0),row('last',0,0)];
  assert.deepEqual(nearbyManifestLocations(rows),[{first:1,second:7,distanceMeters:0}]);
});

test('review keeps the ten-meter threshold precise and handles the antimeridian', () => {
  const metersToLatitude=meters=>meters/6371000*180/Math.PI;
  const base=row('zero',0,0);
  assert.equal(nearbyManifestLocations([base,row('inside',metersToLatitude(9.999),0)]).length,1);
  assert.equal(nearbyManifestLocations([base,row('outside',metersToLatitude(10.001),0)]).length,0);
  assert.equal(nearbyManifestLocations([row('west',0,-179.99999),row('east',0,179.99999)]).length,1);
});
