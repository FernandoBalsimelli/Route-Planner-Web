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

test('a missed interval warns before the eighteen-hour stale threshold and stays visible with details collapsed',async()=>{
 globalThis.fetch=async()=>Response.json({intervalHours:6,checkedAt:'2026-11-18T21:15:00Z',stale:false,overdue:true,notice:'No certifica vigencia.',sources:[{id:'one',title:'Fuente',status:'unchanged'}]});
 await render('one');assert.match(container.querySelector('.source-monitor-alert').textContent,/intervalo previsto/);assert.equal(container.querySelector('details').open,false);assert.match(container.textContent,/no identifica la causa/);assert.doesNotMatch(container.querySelector('.source-monitor-alert').textContent,/Sin cambios/);
});

test('selected-source overdue and availability warnings remain independent of a current aggregate report',async()=>{
 globalThis.fetch=async()=>Response.json({intervalHours:6,checkedAt:'2026-11-19T07:00:00Z',stale:false,overdue:false,sources:[{id:'one',title:'Fuente',status:'unavailable',overdue:true}]});
 await render('one');const alerts=[...container.querySelectorAll('.source-monitor-alert')].map(n=>n.textContent).join(' ');assert.match(alerts,/intervalo previsto/);assert.match(alerts,/no se pudieron comprobar/);assert.equal(container.querySelector('details').open,false);
});

const evidence = (reportRefresh) => ({intervalHours:6,checkedAt:'2026-11-24T10:00:00Z',stale:false,overdue:false,notice:'No certifica vigencia.',reportRefresh,sources:[{id:'one',title:'Fuente conservada',url:'https://official.gob.mx/rules',status:'changed',scope:'Zona A',availability:'partial',reviewedAt:'2026-11-20T00:00:00Z',checkedAt:'2026-11-24T10:00:00Z',lastSuccessAt:'2026-11-23T00:00:00Z',documentBreakdownAvailable:true,documents:[{kind:'primary',url:'https://official.gob.mx/rules',status:'changed'},{kind:'related',url:'https://official.gob.mx/annex',status:'unavailable',error:'HTTP_503'}]}]});
const retrieval = {status:'unavailable',attemptedAt:'2026-11-24T11:00:00Z',lastSuccessAt:'2026-11-24T10:30:00Z',receivedCheckedAt:'2026-11-24T10:00:00Z',nextRefreshAt:'2026-11-24T11:01:00Z',error:'REPORT_NETWORK_OR_TIMEOUT'};

test('report retrieval failure is visible without expanding and preserves changed documents and download history',async()=>{
 globalThis.fetch=async()=>Response.json(evidence(retrieval));await render('one');
 const alerts=[...container.querySelectorAll('.source-monitor-alert')].map(node=>node.textContent).join(' ');
 assert.match(alerts,/No se pudo actualizar el reporte.*comprobación anterior/);assert.match(alerts,/Cambio detectado/);assert.equal(container.querySelector('details').open,false);
 const detail=container.querySelector('.source-report-retrieval').textContent;assert.match(detail,/conexión.*tiempo de espera/);assert.match(detail,/Último intento de recuperación/);assert.match(detail,/Última recuperación correcta/);assert.match(detail,/Próxima recuperación disponible bajo demanda/);assert.match(detail,/no es una hora de actualización garantizada/);
 assert.equal(container.querySelectorAll('.source-documents li').length,2);assert.match(container.textContent,/Última comprobación documental/);assert.match(container.textContent,/No ejecuta una nueva comprobación.*ni una revisión legal/);
});

test('manual retry keeps evidence through HTTP failure, disables concurrent consultation and recovers without remounting',async()=>{
 let calls=0,pendingResolve,signal;globalThis.fetch=async(_url,options)=>{signal=options.signal;calls++;if(calls===1)return Response.json(evidence(retrieval));if(calls===2)return new Promise(resolve=>{pendingResolve=resolve;});return Response.json(evidence({...retrieval,status:'available',error:null}));};await render('one');
 const button=container.querySelector('button'),details=container.querySelector('details');details.open=true;
 await act(async()=>{button.click();});assert.equal(button.disabled,true);assert.equal(calls,2);assert.equal(container.querySelectorAll('.source-documents li').length,2);assert.equal(container.querySelector('.official-source-monitor').getAttribute('aria-busy'),'true');
 await act(async()=>{pendingResolve(Response.json({message:'private server detail'},{status:503}));await new Promise(resolve=>setTimeout(resolve,5));});
 assert.match(container.textContent,/Se mantiene el último reporte mostrado/);assert.doesNotMatch(container.textContent,/private server detail/);assert.equal(button.disabled,false);assert.equal(details.open,true);
 await act(async()=>{button.click();await new Promise(resolve=>setTimeout(resolve,5));});assert.equal(calls,3);assert.equal(details.open,true);assert.doesNotMatch(container.textContent,/No se pudo actualizar el reporte|Seguimiento temporalmente no disponible/);assert.match(container.textContent,/Se pudo recuperar el reporte remoto/);assert.match(container.textContent,/Cambio detectado/);assert.equal(container.querySelectorAll('.source-documents li').length,2);
 await act(async()=>root.unmount());root=null;assert.equal(signal.aborted,true);
});

test('an older remote report is identified separately from the newer displayed documentary evidence',async()=>{
 globalThis.fetch=async()=>Response.json(evidence({...retrieval,status:'available',error:null,receivedCheckedAt:'2026-11-23T00:00:00Z'}));await render('one');assert.match(container.textContent,/último reporte recibido era anterior.*comprobación más reciente/);assert.doesNotMatch(container.textContent,/No se pudo actualizar el reporte/);
 const labels=[...container.querySelectorAll('.source-report-retrieval dt')].map(node=>node.textContent);assert.equal(labels.filter(label=>label.includes('Comprobación')).length,1);assert.match(container.textContent,/Última comprobación documental/);
});

test('optional malformed retrieval metadata never leaks raw errors or breaks legacy source reports',async()=>{
 const {sourceReportRefresh}=await import('../lib/source-report-refresh.ts');
 for(const invalid of [null,[],{status:'something private'},'private'])assert.equal(sourceReportRefresh(invalid),null);
 for(const [code,expected] of [['REPORT_HTTP_503',/HTTP 503/],['REPORT_TOO_LARGE',/tamaño/],['REPORT_INVALID_JSON',/formato/],['REPORT_INVALID_SCHEMA',/formato/],['REPORT_FUTURE_DATE',/futuro/],['REPORT_NETWORK_OR_TIMEOUT',/conexión/],['private token and URL',/No se pudo recuperar/]]){
  globalThis.fetch=async()=>Response.json(evidence({...retrieval,error:code,attemptedAt:'invalid date',nextRefreshAt:{secret:'private'}}));await render('one');assert.match(container.querySelector('.source-report-retrieval').textContent,expected);assert.doesNotMatch(container.textContent,/Invalid Date|private token|secret/);assert.equal(container.querySelector('.source-report-retrieval dd').textContent,'Pendiente');await act(async()=>root.unmount());root=null;container.remove();
 }
});

test('a failed initial request can be retried explicitly and the consultation is aborted on unmount',async()=>{
 let calls=0,lastSignal;globalThis.fetch=async(_url,{signal})=>{lastSignal=signal;calls++;if(calls===1)throw Error('private network error');return Response.json(evidence(undefined));};await render('one');assert.match(container.textContent,/Seguimiento temporalmente no disponible/);assert.equal(container.querySelectorAll('article').length,0);assert.equal(container.querySelector('button').disabled,false);
 await act(async()=>{container.querySelector('button').click();await new Promise(resolve=>setTimeout(resolve,5));});assert.equal(calls,2);assert.match(container.textContent,/Fuente conservada/);assert.doesNotMatch(container.textContent,/Seguimiento temporalmente no disponible/);assert.equal(container.querySelector('.source-report-retrieval'),null);await act(async()=>root.unmount());root=null;assert.equal(lastSignal.aborted,true);
});
