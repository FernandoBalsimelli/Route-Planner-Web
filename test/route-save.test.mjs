import assert from 'node:assert/strict';
import { test } from 'node:test';
import { persistRoute, routeSaveData } from '../lib/route-save.ts';
const result = { distanceMeters: 1000, durationSeconds: 180, sections: [], waypoints: [{type:'origin',label:'Origen',lat:28.66,lng:-106.09},{type:'stop',label:'A',lat:28.67000123,lng:-106.10000456},{type:'stop',label:'B',lat:28.68,lng:-106.11},{type:'destination',label:'Destino',lat:28.69,lng:-106.12}] };
const details = { name:'Express · mañana',vehicleId:'vehicle-12',mode:'truck',vehicle:{heightM:3.2,widthM:2.4,lengthM:8,grossWeightT:12,axleWeightT:6} };
test('atomic payload contains every intermediate point in order, exact coordinates and vehicle snapshot',()=>{
  const data=routeSaveData(result,details);
  assert.deepEqual(data.p_stops.map(point=>point.label),['A','B']);assert.equal(data.p_stops[0].lat,28.67000123);
  assert.equal(data.p_route.vehicle_id,'vehicle-12');assert.equal(data.p_route.route_metadata.vehicle.heightM,3.2);
  assert.equal(data.p_route.origin.label,'Origen');assert.equal(data.p_route.destination.label,'Destino');
});
test('saving sends one transaction RPC and preserves the caller idempotency key on retry',async()=>{
  const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {data:'saved-route-id',error:null};}};
  const data=routeSaveData(result,details);
  await persistRoute(client,data,'same-key');await persistRoute(client,data,'same-key');
  assert.equal(calls[0].name,'save_route_with_stops');assert.equal(calls[0].args.p_request_id,calls[1].args.p_request_id);
  assert.equal(calls[0].args.p_stops.length,2);
});
test('invalid points are rejected before writing and database failures remain visible',async()=>{
  assert.throws(()=>routeSaveData({...result,waypoints:[{type:'origin',label:'Bad',lat:999,lng:0},result.waypoints.at(-1)]},details),/punto 1/);
  assert.throws(()=>routeSaveData({...result,waypoints:[]},details),/origen, destino/);
  await assert.rejects(persistRoute({rpc:async()=>({data:null,error:{message:'Connection interrupted'}})},routeSaveData(result,details),'key'),/Connection interrupted/);
});
