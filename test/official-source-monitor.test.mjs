import {test,after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><body></body>',{url:'https://example.test'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},React:{value:React,configurable:true}});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const originalFetch=globalThis.fetch;
const {createRoot}=await import('react-dom/client');
const {default:Monitor}=await import('../components/OfficialSourceMonitor.tsx');
let root,container;
async function render(sourceId){container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>{root.render(React.createElement(Monitor,{sourceId}));await new Promise(resolve=>setTimeout(resolve,5));});}
afterEach(async()=>{await act(async()=>root?.unmount());container?.remove();globalThis.fetch=originalFetch;});after(()=>dom.window.close());
test('technical source changes, outages and legal review remain distinct and selected source filters the display',async()=>{
 globalThis.fetch=async()=>Response.json({intervalHours:6,checkedAt:'2026-11-09T00:00:00Z',stale:false,notice:'No certifica vigencia.',sources:[{id:'selected',title:'Documento seleccionado',url:'https://official.gob.mx/rules',scope:'Sólo zona A',reviewedAt:'2026-11-09T00:00:00Z',legalReview:'validity_requires_review',status:'changed',checkedAt:'2026-11-09T00:00:00Z',lastSuccessAt:'2026-11-09T00:00:00Z'},{id:'other',title:'Otra fuente',status:'unavailable'}]});
 await render('selected');assert.match(container.textContent,/Cambio detectado · requiere revisión/);assert.match(container.textContent,/Vigencia completa y excepciones sin certificar/);assert.match(container.textContent,/Sólo zona A/);assert.doesNotMatch(container.textContent,/Otra fuente/);assert.equal(container.querySelector('a').href,'https://official.gob.mx/rules');
});
test('malformed source reports display a recoverable failure without crashing the municipal directory',async()=>{
 globalThis.fetch=async()=>Response.json({ok:true,suggestions:[]});await render();assert.match(container.textContent,/Seguimiento temporalmente no disponible/);assert.equal(container.querySelectorAll('article').length,0);
});
