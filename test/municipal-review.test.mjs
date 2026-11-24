import assert from 'node:assert/strict';
import {after,afterEach,test} from 'node:test';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
const dom=new JSDOM('<!doctype html><body></body>',{url:'https://route-planner.example.test'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},React:{value:React,configurable:true}});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const originalFetch=globalThis.fetch;
const {createRoot}=await import('react-dom/client');
const {default:Coverage}=await import('../components/MunicipalCoverage.tsx');
let root,container;
afterEach(async()=>{await act(async()=>root?.unmount());container?.remove();globalThis.fetch=originalFetch;});after(()=>dom.window.close());
async function render(requestedMunicipality){container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(Coverage,{requestedMunicipality})));}
const reference=(id,name,source)=>({municipalityId:id,name,status:source?'reference_only':'not_loaded',source:source?{id:source,url:'https://official.gob.mx/rules',checkedAt:'2026-11-10T00:00:00Z'}:null,trunkSegments:[],timeRules:[],notices:['Pendiente de validación legal.']});
function catalog(){return Response.json({states:[{id:'19',name:'Nuevo León'},{id:'21',name:'Puebla'}],municipalities:[{id:'19039',name:'Monterrey',coverage:'reference_only'},{id:'21114',name:'Puebla',coverage:'reference_only'}],totalMunicipalities:2478,municipalitiesWithPartialReference:14});}
test('requested jurisdiction opens directly, focuses its heading and never uses a default favorite state',async()=>{
 const requests=[];globalThis.fetch=async(url)=>{requests.push(url);return url.includes('?')?catalog():url.endsWith('/source-status')?Response.json({intervalHours:6,stale:false,sources:[]}):Response.json(reference('21114','Puebla','puebla-carga'));};
 await render();assert.equal(container.querySelector('select'),null);assert.deepEqual(requests,[]);
 await act(async()=>{root.render(React.createElement(Coverage,{requestedMunicipality:{id:'21114',request:1}}));await new Promise(resolve=>setTimeout(resolve,10));});
 assert.ok(requests.some(url=>url.includes('?state=21')));assert.ok(requests.some(url=>url.endsWith('/21114')));
 assert.equal(container.querySelectorAll('select')[0].value,'21');assert.equal(container.querySelectorAll('select')[1].value,'21114');assert.match(container.querySelector('h3').textContent,/Puebla/);assert.equal(document.activeElement,container.querySelector('h2'));
});
test('switching jurisdiction aborts the old reference and does not display another municipality source',async()=>{
 let finishOld,oldSignal;globalThis.fetch=async(url,options)=>{if(url.includes('?'))return catalog();if(url.endsWith('/19039')){oldSignal=options.signal;return new Promise(resolve=>{finishOld=resolve;});}return Response.json(reference('21114','Puebla',null));};
 await render({id:'19039',request:1});
 await act(async()=>{root.render(React.createElement(Coverage,{requestedMunicipality:{id:'21114',request:2}}));await new Promise(resolve=>setTimeout(resolve,10));});
 assert.equal(oldSignal.aborted,true);
 await act(async()=>finishOld(Response.json(reference('19039','Monterrey','monterrey-transito'))));
 assert.equal(container.querySelector('h3').textContent,'Puebla');assert.match(container.textContent,/No hay una fuente incorporada para este municipio/);assert.equal(container.querySelector('.official-source-monitor'),null);
});

test('vehicle review preserves jurisdiction, unknown capacity, exact boundary and configuration scope',async()=>{
 const source=reference('21114','Puebla','puebla-carga');
 source.rules=[{id:'capacity',title:'Capacidad de prueba',description:'Ámbito y permiso por comprobar.',citation:'Fuente sintética',vehicleConditions:{payloadCapacityT:{lt:3.5}}},{id:'dimensions',title:'Dimensiones C2',description:'Zona delimitada pendiente.',citation:'Fuente sintética',vehicleConfigurations:['C2'],limits:{grossWeightT:13,widthM:2.6,loadWidthM:2.6}}];
 globalThis.fetch=async(url)=>url.includes('?')?catalog():url.endsWith('/source-status')?Response.json({sources:[],intervalHours:6}):Response.json(source);
 await render({id:'21114',request:1});
 assert.match(container.querySelector('.vehicle-review-context').textContent,/Selecciona Camión/);
 assert.match(container.querySelector('.vehicle-reference-comparison').textContent,/sin dato válido/);
 await act(async()=>root.render(React.createElement(Coverage,{requestedMunicipality:{id:'21114',request:1},vehicle:{payloadCapacityT:3.5,grossWeightT:38,configuration:'T3-S2',axleCount:5}})));
 assert.match(container.querySelector('[data-comparison="boundary"]').textContent,/no se asigna una ventana/);
 assert.match(container.textContent,/no se evalúa tu configuración T3-S2/);
 assert.equal(container.querySelector('h3').textContent,'Puebla');
 assert.match(container.querySelector('.vehicle-review-context').textContent,/Coincidir con un dato no autoriza/);
});

test('planning evidence shows its own source and never renders an operational window or vehicle exemption',async()=>{
 const source=reference('08019','Chihuahua','chihuahua-capital-carga');
 Object.assign(source.source,{documentTypeLabel:'Ley estatal · artículo 66',jurisdictionLabel:'Chihuahua capital, marco estatal',publishedAt:'2006-09-20',consolidatedThrough:'2026-08-08'});
 source.rules=[{id:'proposal',title:'Propuesta de prueba',kind:'planning_proposal',description:'Ejemplos por definir, sin horario vigente.',citation:'Planeación sintética',page:390,sourceUrl:'https://official.gob.mx/plan.pdf',window:{start:'06:00',end:'09:00',timezone:'America/Chihuahua',days:null},vehicleConditions:{payloadCapacityT:{lt:3.5}}}];
 globalThis.fetch=async(url)=>url.includes('?')?catalog():url.endsWith('/source-status')?Response.json({sources:[],intervalHours:6}):Response.json(source);
 await render({id:'08019',request:1});
 const proposal=container.querySelector('[data-evidence-kind="planning_proposal"]');
 assert.match(proposal.textContent,/Propuesta de planeación · no es un horario vigente/);
 assert.doesNotMatch(proposal.textContent,/06:00–09:00|sin dato válido/);assert.equal(proposal.querySelector('.vehicle-reference-comparison'),null);
 assert.equal(proposal.querySelector('a').href,'https://official.gob.mx/plan.pdf#page=390');
 const provenance=container.querySelector('[aria-label="Procedencia de la referencia"]');assert.match(provenance.textContent,/08\/08\/2026/);assert.match(provenance.textContent,/20\/09\/2006/);assert.match(provenance.textContent,/marco estatal/);
});

test('each operational reference keeps its own jurisdiction, dates, activity and PDF page without a vehicle inference',async()=>{
 const source=reference('21114','Puebla','puebla-carga');
 source.rules=[{id:'parking',title:'Estacionamiento de prueba',activity:'parking',description:'Magnitud de tonelaje no especificada en el artículo; horario pendiente.',citation:'Artículo sintético',sourceUrl:'https://official.gob.mx/coremun.pdf',page:176,evidence:{jurisdiction:'Municipio de Puebla · INEGI 21114',scope:'Sólo perímetro rotativo de prueba',consultedAt:'2026-11-15',consolidatedThrough:'2025-12-10'}}];
 globalThis.fetch=async url=>url.includes('?')?catalog():url.endsWith('/source-status')?Response.json({sources:[],intervalHours:6}):Response.json(source);
 await render({id:'21114',request:1});
 const card=container.querySelector('.municipal-time-rules article');
 assert.match(card.textContent,/Estacionamiento · no es permiso de circulación/);
 const evidence=card.querySelector('[aria-label="Ámbito y fecha de esta disposición"]');
 assert.match(evidence.textContent,/Municipio de Puebla · INEGI 21114/);assert.match(evidence.textContent,/Sólo perímetro rotativo/);
 assert.match(evidence.textContent,/15\/11\/2026/);assert.match(evidence.textContent,/10\/12\/2025 · vigencia posterior pendiente de comprobar/);
 assert.equal(card.querySelector('a').href,'https://official.gob.mx/coremun.pdf#page=176');
 await act(async()=>root.render(React.createElement(Coverage,{requestedMunicipality:{id:'21114',request:1},vehicle:{grossWeightT:40,payloadCapacityT:20,configuration:'T3-S2',axleCount:5}})));
 assert.equal(card.querySelector('.vehicle-reference-comparison'),null,'an unspecified tonnage never compares against gross weight or capacity');
 assert.equal(container.querySelector('h3').textContent,'Puebla');
});

test('dated acts show approval separately from consolidation and inclusive matching never becomes a permit',async()=>{
 const source=reference('21114','Puebla','puebla-carga');
 source.rules=[{id:'loading',title:'Ventana de prueba con permiso',activity:'loading',description:'Requiere permiso previo y revisión del corredor.',citation:'Acto sintético',sourceUrl:'https://official.gob.mx/act.pdf',page:70,actEvidence:{jurisdiction:'Municipio de Puebla',scope:'Corredores del programa',consultedAt:'2026-11-15',approvedAt:'2025-08-14'},vehicleConditions:{payloadCapacityT:{lte:3.5}},window:{start:'08:00',end:'20:59',timezone:'America/Mexico_City',days:null}}];
 globalThis.fetch=async url=>url.includes('?')?catalog():url.endsWith('/source-status')?Response.json({sources:[],intervalHours:6}):Response.json(source);
 await render({id:'21114',request:1});
 await act(async()=>root.render(React.createElement(Coverage,{requestedMunicipality:{id:'21114',request:1},vehicle:{grossWeightT:40,payloadCapacityT:3.5}})));
 const card=container.querySelector('.municipal-time-rules article');
 assert.match(card.textContent,/14\/08\/2025 · publicación y vigencia posterior por comprobar/);assert.doesNotMatch(card.textContent,/Consolidación indicada/);
 assert.match(card.textContent,/hasta 3.5 t · coincide sólo este dato/);assert.match(card.textContent,/08:00–20:59 · America\/Mexico_City · días y excepciones por comprobar/);
 assert.match(container.textContent,/Coincidir con un dato no autoriza la circulación/);assert.equal(card.querySelector('a').href,'https://official.gob.mx/act.pdf#page=70');
});

test('a selected historical act separates signature, publication and cited effect without claiming current validity or changing the guide',async()=>{
 const source=reference('09015','Cuauhtémoc','cdmx-centro');
 source.rules=[{id:'guide',title:'Circulación según folleto',citation:'Guía 2024 · página 2',description:'Referencia parcial del folleto.',page:2},{id:'act',title:'Circulación · aviso modificatorio de 2021',kind:'historical_amendment',activity:'circulation',description:'Límites estrictos del acto histórico; igualdad por resolver.',citation:'Gaceta 747, artículo 4-II',sourceUrl:'https://official.gob.mx/gaceta.pdf',page:6,publishedAt:'2021-12-15',effectiveFrom:'2021-12-15',actEvidence:{jurisdiction:'Ciudad de México · SEMOVI',scope:'Sólo Perímetro A',consultedAt:'2026-11-24',approvedAt:'2021-12-08'}}];
 globalThis.fetch=async url=>url.includes('?')?catalog():url.endsWith('/source-status')?Response.json({sources:[],intervalHours:6,stale:false}):Response.json(source);
 await render({id:'09015',request:1});
 const cards=container.querySelectorAll('.municipal-time-rules article'),dates=[...cards[1].querySelectorAll('dl div')].map(row=>[row.querySelector('dt').textContent,row.querySelector('dd').textContent]);
 assert.ok(dates.some(([label,value])=>label==='Fecha del acto citado'&&value==='08/12/2021 · vigencia posterior por comprobar'));
 assert.ok(dates.some(([label,value])=>label==='Publicación del acto citado'&&value==='15/12/2021'));
 assert.ok(dates.some(([label,value])=>label==='Entrada en vigor indicada por el acto'&&value==='15/12/2021 · no acredita vigencia actual'));
 assert.doesNotMatch(cards[1].textContent,/publicación y vigencia posterior por comprobar|Consolidación indicada/);assert.match(cards[1].textContent,/Sólo Perímetro A/);assert.equal(cards[1].querySelector('a').href,'https://official.gob.mx/gaceta.pdf#page=6');assert.equal(cards[1].querySelector('.vehicle-reference-comparison'),null);
 assert.equal(cards[0].querySelector('dl'),null);assert.equal(cards[0].querySelector('a').href,'https://official.gob.mx/rules#page=2');assert.equal(cards[0].textContent.includes('15/12/2021'),false);
});
