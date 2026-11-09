import {test} from 'node:test';
import assert from 'node:assert/strict';
import {googleRouteGuides} from '../lib/google-route-guides.ts';
import {googleMapsSegments} from '../lib/navigation.ts';
import {navigationRoute,encodePath,points} from './fixtures/route-navigation.mjs';
const route={...navigationRoute,waypoints:navigationRoute.waypoints.map((point,i)=>({...point,geometryIndex:i?3:0}))};
test('anchors lie on the original track after maneuvers and retain deliveries in exact order across Google links',()=>{
 const plan=googleRouteGuides(route);assert.equal(plan.guideCount,2);assert.deepEqual(plan.points.filter(point=>!point.navigationLabel.startsWith('Guía')).map(point=>[point.lat,point.lng]),[points[0],points[3]]);
 assert.ok(Math.abs(plan.points[1].lng-(-99.999))<1e-8);assert.ok(plan.points[1].lat>25&&plan.points[1].lat<25.001);
 assert.ok(Math.abs(plan.points[2].lat-25.001)<1e-8);
 for(const limit of [3,9]){const segments=googleMapsSegments(plan.points,limit),all=[];for(const [i,segment] of segments.entries()){const p=new URL(segment.url).searchParams;const part=[p.get('origin'),...(p.get('waypoints')?.split('|')||[]),p.get('destination')];all.push(...part.slice(i?1:0));assert.ok(segment.url.length<=2048);}assert.deepEqual(all,plan.points.map(p=>`${p.lat}, ${p.lng}`));assert.equal(segments[0].startLabel,'Origen');assert.equal(segments.at(-1).endLabel,'Destino');}
});
test('long legs receive guides, loops and repeated delivery coordinates keep provider occurrence rather than nearest point',()=>{
 const track=[[25,-100],[25,-99.98],[25.02,-99.98],[25,-100],[25,-99.98]];
 const plan=googleRouteGuides({polyline:encodePath(track),sections:[],waypoints:[{lat:25,lng:-100,geometryIndex:0},{lat:25,lng:-100,geometryIndex:3},{lat:25,lng:-100,geometryIndex:3},{lat:25,lng:-99.98,geometryIndex:4}]});
 assert.ok(plan.guideCount>=3);const deliveries=plan.points.filter(p=>!p.navigationLabel.startsWith('Guía'));assert.deepEqual(deliveries.map(p=>p.geometryIndex),[0,3,3,4]);assert.deepEqual(deliveries.map(p=>p.navigationLabel),['Origen','Entrega 1','Entrega 2','Destino']);
});
test('old routes and invalid waypoint mappings require recalculation instead of inventing guide positions',()=>{
 assert.throws(()=>googleRouteGuides({...navigationRoute,waypoints:navigationRoute.waypoints.map(({geometryIndex,...point})=>point)}),/Recalcula/);
 for(const indexes of [[0,99],[3,0],[0,.5]])assert.throws(()=>googleRouteGuides({...route,waypoints:route.waypoints.map((point,i)=>({...point,geometryIndex:indexes[i]}))}),/Recalcula/);
 assert.throws(()=>googleRouteGuides({...route,polyline:'invalid'}),/trazado completo/);
});
