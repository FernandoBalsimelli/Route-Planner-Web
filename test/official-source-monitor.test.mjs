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


test('source changes and stale checks remain visible while technical details are collapsed',async()=>{
 globalThis.fetch=async()=>Response.json({intervalHours:6,checkedAt:'2026-11-09T00:00:00Z',stale:true,notice:'Revisión pendiente',sources:[{id:'one',title:'Fuente',status:'unchanged'}]});
 await render('one');assert.match(container.querySelector('.source-monitor-alert').textContent,/Reporte atrasado/);assert.equal(container.querySelector('details').open,false);
});


test('a principal change and linked outage are both visible with exact document history',async()=>{
 globalThis.fetch=async()=>Response.json({intervalHours:6,checkedAt:'2026-11-10T12:00:00Z',stale:false,notice:'No certifica vigencia.',sources:[{id:'one',title:'Fuente seleccionada',url:'https://official.gob.mx/rules',status:'unavailable',availability:'partial',changeDetected:true,documentBreakdownAvailable:true,documents:[{kind:'primary',url:'https://official.gob.mx/rules',status:'changed',checkedAt:'2026-11-10T12:00:00Z',lastSuccessAt:'2026-11-10T12:00:00Z'},{kind:'related',url:'https://official.gob.mx/gazette',status:'unavailable',checkedAt:'2026-11-10T12:00:00Z',lastSuccessAt:'2026-11-09T12:00:00Z',error:'HTTP_503'}]}]});
 await render('one');const alerts=[...container.querySelectorAll('.source-monitor-alert')].map(node=>node.textContent).join(' ');assert.match(alerts,/Cambio detectado/);assert.match(alerts,/no se pudieron comprobar/);assert.equal(container.querySelector('details').open,false);
 const documents=[...container.querySelectorAll('.source-documents li')];assert.equal(documents.length,2);assert.match(documents[0].textContent,/Documento principal.*Cambio detectado/);assert.match(documents[1].textContent,/vinculado.*No se pudo comprobar.*HTTP_503/);assert.equal(documents[1].querySelector('a').href,'https://official.gob.mx/gazette');assert.match(container.textContent,/no prueban una reforma jurídica/);
});
test('fresh global report cannot hide stale selected evidence and legacy detail is explicit',async()=>{
 globalThis.fetch=async()=>Response.json({intervalHours:6,checkedAt:'2026-11-10T12:00:00Z',stale:false,sources:[{id:'one',title:'Fuente anterior',status:'unchanged',stale:true}]});
 await render('one');assert.match(container.querySelector('.source-monitor-alert').textContent,/Reporte atrasado/);assert.match(container.textContent,/no incluye desglose por documento/);assert.equal(container.querySelector('.source-documents'),null);
});
