import assert from 'node:assert/strict';
import {after,afterEach,test} from 'node:test';
import React,{act} from 'react';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html><body></body></html>',{url:'https://routes.example.test'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true}});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');const {default:NavigationLinks}=await import('../components/NavigationLinks.tsx');
let root,container;const points=Array.from({length:12},(_,i)=>({lat:28+i/100,lng:-106,label:`Sucursal ${i}`}));const route={sections:[],waypoints:points,distanceMeters:10,durationSeconds:10};
async function render(props={points,route}){if(!root){container=document.createElement('div');document.body.append(container);root=createRoot(container);}await act(async()=>root.render(React.createElement(NavigationLinks,props)));}
const select=label=>container.querySelector(`select[aria-label="${label}"]`);
async function choose(label,value){await act(async()=>{select(label).value=String(value);select(label).dispatchEvent(new window.Event('change',{bubbles:true}));});}
const links=()=>[...container.querySelectorAll('.navigation-segments a')].map(a=>new URL(a.href));
afterEach(async()=>{await act(async()=>root?.unmount());root=null;container?.remove();window.localStorage.clear();});after(()=>dom.window.close());
test('resume is explicit, survives link-size changes, and resets on new input without calculating or marking deliveries',async()=>{
 await render();assert.equal(select('Retomar desde').value,'0');assert.equal(select('Retomar desde').options.length,11);
 await choose('Retomar desde',7);assert.equal(links()[0].searchParams.get('origin'),`${points[7].lat}, ${points[7].lng}`);assert.match(container.querySelector('[role=status]').textContent,/entrega 7/);
 await choose('Paradas intermedias por enlace',3);assert.equal(select('Retomar desde').value,'7');assert.equal(links().length,1);assert.equal(links()[0].searchParams.get('destination'),`${points[11].lat}, ${points[11].lng}`);
 assert.equal(window.localStorage.length,1,'only the nonprivate Google size preference persists');
 await render({points:[...points],route});assert.equal(select('Retomar desde').value,'0');
 await choose('Retomar desde',3);await act(async()=>container.querySelector('.navigation-continuation button').click());assert.equal(select('Retomar desde').value,'0');
 await choose('Retomar desde',3);await render({points,route:{...route,preferences:{avoidTolls:true,avoidHighways:true}}});assert.equal(select('Retomar desde').value,'0');assert.equal(links()[0].searchParams.get('avoid'),'tolls,highways');
});
test('an incomplete stop blocks navigation with a specific error until repaired',async()=>{
 await render({points:[points[0],null,points[2]],route:null});assert.equal(links().length,0);assert.match(container.querySelector('[role=alert]').textContent,/punto 2/);
 await render({points:points.slice(0,3),route:null});assert.equal(links().length,1);assert.equal(select('Retomar desde'),null,'resume is offered for a calculated route only');
});
