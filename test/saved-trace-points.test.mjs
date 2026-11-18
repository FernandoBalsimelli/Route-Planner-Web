import assert from 'node:assert/strict';
import {after,afterEach,test}from'node:test';
import React,{act}from'react';import{JSDOM}from'jsdom';
const dom=new JSDOM('<body></body>',{url:'https://routes.example.test'});Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true}});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const{createRoot}=await import('react-dom/client');const{default:List}=await import('../components/SavedTracePointList.tsx');let root,container;
const points=Array.from({length:50},(_,sequence)=>({lat:28.63,lng:-106.06,label:sequence===2?'Acceso repetido':sequence===1?'Acceso repetido':'Punto '+sequence,type:sequence===0?'origin':sequence===49?'destination':'stop',sequence}));
async function render(completed=[1,3,49],focused=null){const calls=[];container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(List,{points,completed,focused,onFocus:n=>calls.push(n),onShowAll:()=>calls.push('all')})));return calls;}
afterEach(async()=>{await act(async()=>root?.unmount());container?.remove();});after(()=>dom.window.close());
test('all 50 ordered visits remain available and a repeated address selects the original occurrence',async()=>{
 const calls=await render();const rows=container.querySelectorAll('li');assert.equal(rows.length,50);assert.match(rows[1].textContent,/Entrega 1.*Completado manualmente/);assert.match(rows[2].textContent,/Entrega 2.*Pendiente/);assert.match(rows[49].textContent,/Destino.*Completado manualmente/);
 await act(async()=>rows[2].querySelector('button').click());assert.deepEqual(calls,[2]);assert.equal(container.querySelectorAll('[data-delivery-state=completed]').length,3);assert.equal(container.querySelectorAll('[data-delivery-state=pending]').length,46);
});
test('first pending is based on manual progress and map selection does not invoke an edit or skip action',async()=>{
 const calls=await render([1,3,49],2);const buttons=[...container.querySelectorAll('button')];await act(async()=>buttons.find(b=>b.textContent==='Ubicar primera pendiente').click());assert.deepEqual(calls,[2]);assert.equal(container.querySelectorAll('[aria-pressed=true]').length,1);assert.equal(container.querySelector('[aria-pressed=true]').getAttribute('aria-label'),'Ubicar entrega 2 en el mapa');
 await act(async()=>buttons.find(b=>b.textContent==='Ver recorrido completo').click());assert.deepEqual(calls,[2,'all']);assert.equal(container.querySelectorAll('input,a').length,0);
});
test('all completed disables the first-pending shortcut but retains every point for manual map review',async()=>{
 const calls=await render(Array.from({length:49},(_,i)=>i+1));const buttons=[...container.querySelectorAll('button')];assert.equal(buttons.find(b=>b.textContent==='Ubicar primera pendiente').disabled,true);assert.equal(buttons.find(b=>b.textContent==='Ver recorrido completo').disabled,true);assert.equal(container.querySelectorAll('li').length,50);
 await act(async()=>container.querySelector('li:last-child button').click());assert.deepEqual(calls,[49]);assert.equal(container.querySelector('[data-delivery-state=origin] small').textContent,'Inicio del cálculo');
});
