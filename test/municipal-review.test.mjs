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
