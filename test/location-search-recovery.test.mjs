import assert from 'node:assert/strict';
import {test,after,afterEach} from 'node:test';
import React,{act,useState} from 'react';
import {JSDOM} from 'jsdom';
import {locationSearchUrl} from '../lib/location-review.ts';

const dom=new JSDOM('<html><body></body></html>',{url:'https://example.test'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true}});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');
const {default:LocationInput}=await import('../components/LocationInput.tsx');
const oldFetch=globalThis.fetch;
const point={label:'Acceso propuesto para revisar',lat:28.635300123,lng:-106.088900456};
let root,container,picked,calls;
const link=()=>{const node=container.querySelector('.location-search-recovery a'),details=node?.closest('details');return details&&!details.open?null:node;};
const button=text=>[...container.querySelectorAll('button')].find(node=>node.textContent.includes(text));
const settle=()=>act(async()=>new Promise(resolve=>setTimeout(resolve,350)));
async function fill(value){const input=container.querySelector('[role="combobox"]');await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new window.Event('input',{bubbles:true}));});}
async function render(response,initial='Bodega Aurrerá Express 50% (A), Chihuahua',onSuggestions){
 picked=null;calls=[];globalThis.fetch=async url=>{calls.push(url);return response(url);};
 function Harness(){const [value,setValue]=useState(initial),[selected,setSelected]=useState(null);return React.createElement(LocationInput,{title:'Destino',color:'orange',value,selected,placeholder:'',apiUrl:'/api',mapReference:{lat:28.63,lng:-106.08},onChange:next=>{setValue(next);setSelected(null);},onConfirm:next=>{picked=next;setSelected(next);},onSuggestions});}
 container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(Harness)));
}
afterEach(async()=>{await act(async()=>root?.unmount());root=null;container?.remove();globalThis.fetch=oldFetch;});after(()=>dom.window.close());

test('external recovery encodes the literal location query without sending a reference point or overriding the city',()=>{
 for(const query of ['Bodega 50%_* (A), Peña & hijos #2','75XMRW22+22','28.635300123,-106.088900456','Bodega Aurrera Express, Ciudad Juárez','a'.repeat(180)]){
  const href=locationSearchUrl(' '+query+' '),url=new URL(href);assert.equal(url.origin,'https://www.google.com');assert.equal(url.pathname,'/maps/search/');assert.equal(url.searchParams.get('api'),'1');assert.equal(url.searchParams.get('query'),query);assert.deepEqual([...url.searchParams.keys()],['api','query']);assert.ok(href.length<=2048);
 }
});
test('empty, oversized, control-bearing or URL-valued searches do not generate a recovery link',()=>{
 for(const query of ['', ' ', 'B', 'a'.repeat(181),'Bodega\nExpress','Bodega\u0000Express','https://maps.app.goo.gl/example','Sucursal https://private.example/token'])assert.equal(locationSearchUrl(query),null);
});
test('provider failure keeps its specific error and offers a click-only external recovery before explicit coordinate confirmation',async()=>{
 const value='Bodega Aurrerá Express 50% (A), Chihuahua';let fail=true;
 await render(()=>fail?Response.json({code:'PHOTON_UNAVAILABLE',message:'Proveedor alterno no disponible.'},{status:503}):Response.json({ok:true,suggestions:[point]}),value);assert.equal(link(),null);await settle();
 assert.equal(new URL(link().href).searchParams.get('query'),value);assert.equal(link().target,'_blank');assert.match(link().rel,/noopener/);assert.match(link().rel,/noreferrer/);assert.match(container.querySelector('[role="alert"]').textContent,/Proveedor alterno no disponible/);assert.equal(container.querySelector('[role="alert"]').dataset.errorCode,'PHOTON_UNAVAILABLE');assert.equal(container.querySelector('[role="combobox"]').value,value);assert.equal(picked,null);assert.equal(calls.length,1);assert.ok(calls.every(url=>url.startsWith('/api/')));
 fail=false;await fill('28.635300123,-106.088900456');assert.equal(link(),null);await settle();assert.equal(link(),null);await act(async()=>container.querySelector('[role="option"]').click());assert.equal(picked,null);assert.equal(link(),null);await act(async()=>button('Confirmar punto').click());assert.deepEqual(picked,point);assert.equal(link(),null);assert.equal(calls.length,2);
});
test('empty and distant searches offer recovery without exposing a far candidate or confirming a store',async()=>{
 let far=false;await render(()=>Response.json({ok:true,suggestions:far?[{...point,label:'Express en otra ciudad',distanceMeters:655570}]:[],...(far?{warning:'NO_NEARBY_MATCHES'}:{})}));await settle();assert.ok(link());assert.equal(picked,null);
 far=true;await fill('Bodega Aurrera Express');await settle();assert.ok(link());assert.equal(container.querySelector('[role="option"]'),null);assert.ok(button('Ver coincidencias lejanas'));assert.equal(picked,null);assert.equal(calls.length,2);
});
test('normal suggestions offer collapsed manual recovery without assuming the city matches, while short drafts hide it',async()=>{
 await render(()=>Response.json({ok:true,suggestions:[{...point,label:'Express, Ciudad de México'}]}));await settle();assert.ok(container.querySelector('[role="option"]'));assert.equal(link(),null);assert.ok(container.querySelector('details'));
 await act(async()=>container.querySelector('summary').click());assert.ok(link());assert.equal(new URL(link().href).searchParams.get('query'),'Bodega Aurrerá Express 50% (A), Chihuahua');assert.equal(picked,null);assert.equal(calls.length,1);
 await fill('B');await settle();assert.equal(link(),null);assert.equal(container.querySelector('details'),null);assert.equal(calls.length,1);
});

test('unverified locality is hidden from list, keyboard and map until explicitly reviewed, and editing resets the gate',async()=>{
 const updates=[];let unverified=true;
 await render(()=>Response.json({ok:true,suggestions:[{...point,label:'Bodega Aurrera Express, Ciudad de México'}],...(unverified?{warning:'LOCALITY_NOT_VERIFIED'}:{})}),'Bodega Aurrera Express, Chihuahua',value=>updates.push(value));
 await act(async()=>container.querySelector('[role="combobox"]').focus());await settle();
 assert.match(container.textContent,/No pudimos corroborar la localidad escrita/);assert.equal(container.querySelector('[role="option"]'),null);assert.ok(link());assert.ok(updates.every(value=>value.length===0));assert.equal(picked,null);
 await act(async()=>container.querySelector('[role="combobox"]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));assert.equal(container.querySelector('.location-confirm-card'),null);
 await act(async()=>button('Ver coincidencias sin localidad corroborada').click());assert.ok(container.querySelector('[role="option"]'));assert.equal(updates.at(-1).length,1);
 await act(async()=>button('Ocultar coincidencias sin localidad corroborada').click());assert.equal(container.querySelector('[role="option"]'),null);assert.deepEqual(updates.at(-1),[]);
 unverified=false;await fill('Bodega Aurrera Express, Delicias');await settle();assert.ok(container.querySelector('[role="option"]'));assert.equal(button('Ver coincidencias sin localidad corroborada'),undefined);assert.doesNotMatch(container.textContent,/No pudimos corroborar/);
 await act(async()=>container.querySelector('[role="option"]').click());assert.equal(picked,null);assert.ok(container.querySelector('.location-confirm-card'));
});
