import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confirmedRouteInputs, routePointIssues } from '../lib/confirmed-route-inputs.ts';
const confirmed = (label, lat=28.635300123, lng=-106.088900456) => ({value:label,selected:{label,lat,lng}});
test('typed coordinates, Plus Codes and branch names require selection before planning',()=>{
 for(const value of ['28.6353,-106.0889','75XMRW22+22','Bodega Aurrera Express']){
  assert.throws(()=>confirmedRouteInputs(confirmed('Origen'),[],{value}),/destino/);
  assert.deepEqual(routePointIssues(confirmed('Origen'),[],{value}),[{label:'Destino',empty:false}]);
 }
});
test('empty or edited occurrences are not silently filtered out or replaced by raw text',()=>{
 const stops=[confirmed('Entrega'),{value:''},{value:'Acceso corregido',selected:confirmed('Acceso anterior').selected}];
 assert.deepEqual(routePointIssues(confirmed('Origen'),stops,confirmed('Destino')),[{label:'PARADA 2',empty:true},{label:'PARADA 3',empty:false}]);
 assert.throws(()=>confirmedRouteInputs(confirmed('Origen'),stops,confirmed('Destino')),/parada 2, parada 3/);
 for(const selected of [{label:'Destino',lat:NaN,lng:0},{label:'Destino',lat:95,lng:0},{label:'Destino',lat:'28',lng:-106}])assert.throws(()=>confirmedRouteInputs(confirmed('Origen'),[],{value:'Destino',selected}));
});
test('all 48 deliveries preserve exact coordinates, repeated visits and order',()=>{
 const stops=Array.from({length:48},(_,i)=>confirmed(i<2?'Sucursal repetida':`Entrega ${i+1}`,28.635300123+i*.000001));
 stops[1]=confirmed('Sucursal repetida');
 const payload=confirmedRouteInputs(confirmed('Origen',0,0),stops,confirmed('Destino'));
 assert.equal(payload.stops.length,48);assert.deepEqual(payload.stops,stops.map(s=>s.selected));assert.equal(payload.origin.lat,0);assert.equal(payload.destination.lng,-106.088900456);assert.equal(payload.stops[0].lat,payload.stops[1].lat);
 assert.throws(()=>confirmedRouteInputs(confirmed('Origen'),[...stops,confirmed('Entrega 49')],confirmed('Destino')),/48/);
});
