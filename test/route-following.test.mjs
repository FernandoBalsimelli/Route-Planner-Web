import assert from 'node:assert/strict';
import {test} from 'node:test';
import {followTrack,prepareTrack,meters} from '../lib/route-following.ts';
import {encodePath} from './fixtures/route-navigation.mjs';
const points=[[25,-100],[25,-99.999],[25.001,-99.999],[25.001,-99.998]],polyline=encodePath(points),track=prepareTrack(polyline);
const route={distanceMeters:320,durationSeconds:50,polyline,sections:[{actions:[{instruction:'Sal del origen',geometryStart:0,geometryEnd:1},{instruction:'Gira a la izquierda',geometryStart:1,geometryEnd:2},{instruction:'Gira a la derecha',geometryStart:2,geometryEnd:3},{instruction:'Llegada',geometryStart:3,geometryEnd:3}]}]};
const fix=(lat,lng,t=1000,accuracy=10)=>({lat,lng,timestamp:t,accuracy});
test('guidance uses the next maneuver position and preserves the calculated track',()=>{
 const before=JSON.stringify(track),first=followTrack(track,fix(25,-99.9995),null,route);
 assert.equal(first.status,'on_route');assert.equal(first.instruction,'Gira a la izquierda');assert.ok(first.maneuverDistance>40&&first.maneuverDistance<60);
 const next=followTrack(track,fix(25.0005,-99.999,3000),first,route);
 assert.equal(next.instruction,'Gira a la derecha');assert.ok(next.remaining<first.remaining);assert.equal(JSON.stringify(track),before);
});
test('off-route and inaccurate positions never advance route progress or fabricate a return instruction',()=>{
 const first=followTrack(track,fix(25,-99.9995),null,route);
 const off=followTrack(track,fix(25.01,-99.999,2000),first,route);assert.equal(off.status,'off_route');assert.equal(off.along,first.along);assert.equal(off.instruction,undefined);
 const poor=followTrack(track,fix(25.001,-99.998,3000,200),first,route);assert.equal(poor.status,'poor_accuracy');assert.equal(poor.along,first.along);
 assert.equal(followTrack(track,fix(25,-99.9997,500),first,route),first);
});
test('first inaccurate fix does not prevent acquiring a later accurate position',()=>{
 const poor=followTrack(track,fix(25.001,-99.999,1000,500));
 assert.equal(followTrack(track,fix(25.0009,-99.999,2000),poor).status,'on_route');
});
test('nearby crossings and impossible GPS jumps do not skip future sections',()=>{
 const loop=prepareTrack(encodePath([[25,-100],[25,-99.995],[25.005,-99.995],[25.005,-100],[25,-100],[25,-99.99]]));
 const first=followTrack(loop,fix(25,-100));
 const crossing=followTrack(loop,fix(25,-99.9999,2000),first);assert.ok(crossing.along<30);
 const jump=followTrack(loop,fix(25,-99.9901,3000),crossing);assert.equal(jump.status,'off_route');assert.equal(jump.along,crossing.along);
 const repeat=followTrack(loop,fix(25,-99.9901,4000),jump);assert.equal(repeat.status,'off_route');assert.equal(repeat.along,crossing.along);
});
test('arrival is detected only near the final geometry and malformed routes fail closed',()=>{
 assert.equal(followTrack(track,fix(25.001,-99.998)).status,'arrived');
 assert.equal(prepareTrack('invalid'),null);assert.equal(prepareTrack(undefined),null);assert.equal(prepareTrack(encodePath([[25,-100],[25,-100]])),null);
 assert.throws(()=>followTrack(track,fix(999,0)),/GPS_INVALID/);assert.ok(meters([0,179.999],[0,-179.999])<230);
});
