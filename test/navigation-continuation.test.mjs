import assert from 'node:assert/strict';
import {test} from 'node:test';
import {googleMapsSegments} from '../lib/navigation.ts';
import {remainingNavigationPoints} from '../lib/navigation-continuation.ts';
import {googleRouteGuides} from '../lib/google-route-guides.ts';
import {encodePath} from './fixtures/route-navigation.mjs';
const flatten=segments=>segments.flatMap((segment,index)=>{const p=new URL(segment.url).searchParams;return [p.get('origin'),...(p.get('waypoints')?.split('|')||[]),p.get('destination')].slice(index?1:0);});
const coordinates=points=>points.map(p=>`${p.lat}, ${p.lng}`);
test('an invalid intermediate, endpoint or waypoint separator never silently drops a delivery',()=>{
 for(const invalid of [null,undefined,'','   ','Sucursal | otra', {lat:NaN,lng:0},{lat:91,lng:0},{lat:0,lng:Infinity}]){
  assert.throws(()=>googleMapsSegments(['Origen',invalid,'Destino']),/Revisa el punto 2/);
 }
 assert.throws(()=>googleMapsSegments(['', 'Entrega', 'Destino']),/Revisa el punto 1/);
 assert.throws(()=>googleMapsSegments(['Origen','Entrega',null]),/Revisa el punto 3/);
 assert.deepEqual(googleMapsSegments(['',null,'Origen']),[]);
});
for(const limit of [3,9])test(`all remaining deliveries keep their original order and endpoint continuity (${limit})`,()=>{
 const points=Array.from({length:50},(_,i)=>({lat:28+i/10000,lng:-106,label:'Entrega sintética '+i}));
 for(const start of [0,1,7,24,48]){
  const rest=remainingNavigationPoints(points,start);const segments=googleMapsSegments(rest.points,limit,{avoidTolls:true,avoidHighways:true});
  assert.deepEqual(flatten(segments),coordinates(points.slice(start)));assert.equal(segments[0].startLabel,start?'Entrega '+start:'Origen');assert.equal(segments.at(-1).endLabel,'Destino');
  for(const segment of segments){const p=new URL(segment.url).searchParams;assert.equal(p.get('avoid'),'tolls,highways');assert.ok(segment.url.length<=2048);assert.ok((p.get('waypoints')?.split('|')||[]).length<=limit);}
 }
 assert.equal(points[0].navigationLabel,undefined,'source route is not mutated');
});
test('truck continuation uses the exact repeated delivery occurrence and keeps only its subsequent guides',()=>{
 const path=[[25,-100],[25,-99.98],[25.02,-99.98],[25,-100],[25,-99.98]];
 const points=[{lat:25,lng:-100,geometryIndex:0},{lat:25,lng:-100,geometryIndex:3},{lat:25,lng:-100,geometryIndex:3},{lat:25,lng:-99.98,geometryIndex:4}];
 const guidePlan=googleRouteGuides({polyline:encodePath(path),sections:[],waypoints:points});
 const rest=remainingNavigationPoints(points,2,guidePlan.points);
 assert.equal(rest.points[0].navigationLabel,'Entrega 2');assert.equal(rest.points[0].waypointIndex,2);
 assert.deepEqual(rest.points.filter(p=>p.waypointIndex!==undefined).map(p=>p.waypointIndex),[2,3]);
 assert.ok(rest.guideCount>0);assert.ok(rest.guideCount<guidePlan.guideCount);
 assert.deepEqual(flatten(googleMapsSegments(rest.points,3)),coordinates(rest.points));
 const changed=structuredClone(guidePlan.points);changed[0].lat=26;
 assert.throws(()=>remainingNavigationPoints(points,1,changed),/asociar/);
 assert.throws(()=>remainingNavigationPoints(points,1,guidePlan.points.filter(p=>p.waypointIndex!==1)),/asociar/);
});
test('invalid continuation cannot reinterpret the final destination or truncate an itinerary',()=>{
 const points=['Origen','Entrega','Destino'];
 for(const index of [-1,0.5,2,3,NaN])assert.throws(()=>remainingNavigationPoints(points,index),/Elige/);
});
