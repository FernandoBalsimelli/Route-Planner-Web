import assert from 'node:assert/strict';
import {after,afterEach,test} from 'node:test';
import {registerHooks} from 'node:module';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {candidateMapPoints} from '../lib/map-locations.ts';
const dom=new JSDOM('<html><body></body></html>',{url:'https://route-planner.example.test'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true},Element:{value:dom.window.Element,configurable:true},HTMLElement:{value:dom.window.HTMLElement,configurable:true}});
dom.window.SVGSVGElement.prototype.createSVGRect=()=>({});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const cssHook=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {};',shortCircuit:true}:next(url,context);}});
const {createRoot}=await import('react-dom/client');const {default:RouteMap}=await import('../components/RouteMap.tsx');
let root,container;
afterEach(async()=>{await act(async()=>root?.unmount());container?.remove();});after(()=>{cssHook.deregister();dom.window.close();});
async function render(props){container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(RouteMap,props)));}
test('planning map is available before a route is calculated and does not invent a road line',async()=>{
  await render({planning:true,waypoints:[]});assert.ok(container.querySelector('.leaflet-container'));assert.equal(container.querySelector('.leaflet-overlay-pane path'),null);assert.match(container.textContent,/OpenStreetMap/);
});
test('branch markers open a confirmation popup and preserve the selected coordinates',async()=>{
  let chosen;
  const candidates=[{label:'Sucursal cercana',lat:25.721274,lng:-100.325989,distanceMeters:4200},{label:'Sucursal dos',lat:25.703465,lng:-100.253977,distanceMeters:6501}];
  await render({planning:true,waypoints:[{type:'origin',label:'Monterrey',lat:25.685,lng:-100.315}],candidates,targetTitle:'Destino',onChooseCandidate:point=>{chosen=point;}});
  assert.equal(container.querySelectorAll('.rp-map-pin-search').length,2);assert.equal(chosen,undefined);
  await act(async()=>container.querySelector('[title="Sugerencia 2: Sucursal dos"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
  assert.match(container.querySelector('.leaflet-popup-content').textContent,/6.5 km/);
  await act(async()=>container.querySelector('.map-candidate-confirm').click());assert.equal(chosen,candidates[1]);assert.equal(chosen.lng,-100.253977);
});
test('viewport stays near the first relevant match when the provider also returns distant countries',()=>{
  const points=candidateMapPoints([{label:'Monterrey',lat:25.68,lng:-100.31},{label:'Guadalupe',lat:25.7,lng:-100.25},{label:'Colombia',lat:4.6,lng:-74}]);assert.deepEqual(points,[[25.68,-100.31],[25.7,-100.25]]);
});
