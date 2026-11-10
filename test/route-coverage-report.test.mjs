import assert from 'node:assert/strict';
import {after,afterEach,test} from 'node:test';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {navigationRoute} from './fixtures/route-navigation.mjs';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://route-planner.example.test'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true},React:{value:React,configurable:true}});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');const {default:Report}=await import('../components/RouteCoverageReport.tsx');let root,container;
afterEach(async()=>{await act(async()=>root?.unmount());container?.remove();});after(()=>dom.window.close());
async function render(coverage,onOpenGuide=()=>{}){if(arguments.length===0)coverage=navigationRoute.regulatoryCoverage;container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(Report,{coverage,onOpenGuide})));}
test('route report orders identified jurisdictions and distinguishes references from missing rules',async()=>{
 await render();const items=[...container.querySelectorAll('.route-municipalities li')];assert.equal(items.length,2);assert.match(items[0].textContent,/Monterrey.*Referencia cargada/);assert.match(items[1].textContent,/Guadalupe.*Reglas pendientes/);assert.match(container.textContent,/56 m/);assert.match(container.textContent,/Ninguna regla municipal se aplica todavía/);assert.doesNotMatch(container.textContent,/ruta permitida|ruta legal/i);
});
test('route report exposes source review and unresolved geometry without treating it as unrestricted',async()=>{
 let opened=0;await render({...navigationRoute.regulatoryCoverage,municipalitiesIdentified:[],message:'No se pudieron identificar municipios.'},()=>opened++);await act(async()=>container.querySelector('button').click());assert.equal(opened,1);assert.match(container.textContent,/no se interpreta como circulación libre/i);
});
test('old routes without a coverage payload request a recalculation',async()=>{await render(undefined);assert.match(container.textContent,/Vuelve a calcularla/);});


test('each identified municipality opens its own review without implying routing approval',async()=>{
 const opened=[];await render(navigationRoute.regulatoryCoverage,id=>opened.push(id));
 const buttons=[...container.querySelectorAll('.municipality-review')];assert.equal(buttons.length,2);
 await act(async()=>buttons[1].click());assert.deepEqual(opened,['19026']);
 assert.equal(buttons[0].getAttribute('aria-label'),'Revisar normativa de Monterrey');
});
