import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { readRecent, recentKey, rememberLocation, favoritePoint } from '../lib/location-book.ts';
import { routeCsv, routeGpx, routeGeoJson } from '../lib/route-exports.ts';
import { decodePolyline } from '../lib/polyline.ts';

const route = { distanceMeters: 1000, durationSeconds: 180, sections: [], polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', waypoints: [{ type: 'origin', label: '=FORMULA,"Tienda" & <origen>', lat: 38.5, lng: -120.2 }, { type: 'stop', label: 'Sucursal B', lat: 40.7, lng: -120.95 }, { type: 'destination', label: 'Destino', lat: 43.252, lng: -126.453 }] };
test('recent locations preserve exact coordinates, deduplicate and limit data to 12 points per account', () => {
  let recent = [];
  for (let i=0;i<15;i++) recent = rememberLocation(recent, { label: `Tienda ${i}`, lat: 25 + i/100, lng: -100, source: 'geolocation', accuracyM: 10 });
  assert.equal(recent.length, 12); assert.equal(recent[0].label, 'Tienda 14'); assert.equal(recent[0].accuracyM, undefined);
  recent = rememberLocation(recent, { ...recent[3], label: 'Nombre corregido' }); assert.equal(recent.length, 12); assert.equal(recent[0].label, 'Nombre corregido');
  assert.notEqual(recentKey('owner-one'), recentKey('owner-two')); assert.notEqual(recentKey(), recentKey('owner-one'));
  assert.deepEqual(readRecent('invalid'), []); assert.deepEqual(readRecent('[{"label":"Bad","lat":999,"lng":0}]'), []);
  const saved = favoritePoint({ id:'favorite', name:'Unidad 12', address_label:'Sucursal real', lat:25.721274, lng:-100.325989, plus_code:'75QXPMCF+GJ' });
  assert.equal(saved.lat,25.721274); assert.equal(saved.plusCode,'75QXPMCF+GJ');
});
test('CSV preserves order and numeric coordinates, escapes quotes and prevents spreadsheet formulas', () => {
  const csv = routeCsv(route);
  assert.ok(csv.startsWith('\uFEFForden,tipo,direccion'));
  assert.ok(csv.includes('"\'=FORMULA,""Tienda"" & <origen>"'));
  assert.ok(csv.includes('38.5,-120.2')); assert.ok(csv.indexOf('Sucursal B') < csv.indexOf('Destino'));
});
test('GPX is valid XML, escapes place labels and separates route points from provider track', () => {
  const dom = new JSDOM(routeGpx(route,true), { contentType:'application/xml' }); const doc=dom.window.document;
  assert.equal(doc.querySelectorAll('rtept').length,3); assert.equal(doc.querySelectorAll('trkpt').length,3);
  assert.equal(doc.querySelector('rtept name').textContent,route.waypoints[0].label);
  assert.match(doc.querySelector('metadata desc').textContent,/no transfiere/);
  dom.window.close();
  const noGeometry = new JSDOM(routeGpx({ ...route, polyline: undefined }), { contentType:'application/xml' });
  assert.equal(noGeometry.window.document.querySelectorAll('trk').length,0); noGeometry.window.close();
});
test('GeoJSON uses longitude/latitude and does not invent geometry for missing or corrupt polylines', () => {
  const json = JSON.parse(routeGeoJson(route,true));
  assert.deepEqual(json.features[0].geometry.coordinates,[-120.2,38.5]);
  assert.equal(json.features.at(-1).geometry.type,'LineString'); assert.equal(json.features.at(-1).properties.truckRestrictionsTransferred,false);
  assert.equal(JSON.parse(routeGeoJson({ ...route, polyline:'bad' })).features.length,3);
  assert.deepEqual(decodePolyline('bad'),[]); assert.deepEqual(decodePolyline(route.polyline),[[38.5,-120.2],[40.7,-120.95],[43.252,-126.453]]);
  assert.throws(()=>routeGpx({ ...route, waypoints:[{lat:999,lng:0,type:'origin'}] }),/puntos válidos/);
});
