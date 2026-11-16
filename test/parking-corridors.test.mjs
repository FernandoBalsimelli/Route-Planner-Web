import assert from 'node:assert/strict';
import {test,after,afterEach} from 'node:test';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {filterParkingCorridors,citedParkingHours} from '../lib/parking-corridors.ts';
const hours=[{days:[1,2,3,4,5],status:'hours_cited',start:'08:00',end:'22:00'},{days:[6],status:'hours_cited',start:'11:00',end:'17:00'},{days:[7],status:'not_applicable_in_source'}];
const row=(id,polygon,corridor,betweenStreets,sourcePages=[80])=>({sourceRow:id,polygon,corridor,betweenStreets,sourcePages,schedules:hours,geometry:null,geometryStatus:'not_validated',directionStatus:'not_specified_in_annex',routingEnforced:false});
const rows=[row(1,'Polígono 1 Centro Histórico','12 Poniente-Oriente','11 Norte y 4 Norte'),row(124,'Polígono 5 San Alejandro - Ortopedia','29 A Norte','8 Poniente y Diagonal de la 10 Poniente',[87,88]),row(126,'Polígono 6 San Alejandro - Ortopedia','Diagonal 10 Poniente','Blvd. Norte y 10 Poniente',[88]),row(128,'Polígono 6 San Alejandro - Ortopedia','Diagonal 10 Poniente','Blvd. Norte y 10 Poniente',[88])];
const reference={municipalityId:'21114',activity:'parking_operation',timezone:'America/Mexico_City',status:'reference_only',routingEnforced:false,source:{url:'https://official.gob.mx/annex.pdf',approvedAt:'2025-08-14',consultedAt:'2026-11-15',pages:[80,87,88]},notices:['Operating schedule only.','No routing enforcement.','La fuente conserva polígonos 5 y 6.'],duplicateGroups:[[126,128]],rows};
test('corridor search matches accents and crossings without deduplicating repeated source rows or conflating polygon labels',()=>{
 assert.deepEqual(filterParkingCorridors(rows,'centro HISTORICO 4 norte','').map(r=>r.sourceRow),[1]);
 assert.deepEqual(filterParkingCorridors(rows,'diagonal','Polígono 6 San Alejandro - Ortopedia').map(r=>r.sourceRow),[126,128]);
 assert.deepEqual(filterParkingCorridors(rows,'alejandro','Polígono 5 San Alejandro - Ortopedia').map(r=>r.sourceRow),[124]);
 assert.deepEqual(filterParkingCorridors(rows,'no such corridor',''),[]);assert.deepEqual(rows.map(r=>r.sourceRow),[1,124,126,128]);
});
test('parking hours preserve no-applies and unknown states without implying free circulation',()=>{
 assert.equal(citedParkingHours(hours[0]),'08:00–22:00');assert.equal(citedParkingHours(hours[2]),'«No aplica» en el anexo');
 for(const item of [{days:[7],status:'unknown'},{days:[7],status:'hours_cited',start:'oops',end:'17:00'},{days:[7],status:'hours_cited',start:'25:00',end:'17:00'}])assert.equal(citedParkingHours(item),'Sin horario verificado');
});
const dom=new JSDOM('<!doctype html><body></body>',{url:'https://route-planner.example.test'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},React:{value:React,configurable:true}});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');const {default:Corridors}=await import('../components/MunicipalParkingCorridors.tsx');
let root,container;afterEach(async()=>{await act(async()=>root?.unmount());container?.remove();});after(()=>dom.window.close());
test('annex is initially folded, filters both names and polygons, preserves split-page links and shows its limited purpose',async()=>{
 container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(Corridors,{reference})));
 assert.equal(container.querySelector('input'),null,'rows and controls are rendered when the annex opens');
 await act(async()=>{const details=container.querySelector('details');details.open=true;details.dispatchEvent(new dom.window.Event('toggle'));});
 assert.equal(container.querySelectorAll('.parking-corridors-list>li').length,4);assert.match(container.textContent,/no acredita circulación ni estacionamiento autorizado/);
 const input=container.querySelector('input');await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,'alejandro');input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
 // jsdom/React input events are also covered in the browser; select the polygon
 // here to verify exact source labels do not merge records 5 and 6.
 const select=container.querySelector('select');await act(async()=>{select.value='Polígono 5 San Alejandro - Ortopedia';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
 assert.equal(container.querySelectorAll('.parking-corridors-list>li').length,1);
 assert.deepEqual([...container.querySelectorAll('a')].map(a=>a.href),['https://official.gob.mx/annex.pdf#page=87','https://official.gob.mx/annex.pdf#page=88']);
 assert.match(container.textContent,/«No aplica» en el anexo/);assert.match(container.textContent,/Sentido de circulación sin especificar/);
});
