import assert from 'node:assert/strict';
import {test} from 'node:test';
import React,{act,useState} from 'react';
import {renderToString} from 'react-dom/server';
import {JSDOM} from 'jsdom';

test('server-rendered location tools become usable after their handlers attach and accept an unconfirmed precise draft',async()=>{
 const {default:LocationInput}=await import('../components/LocationInput.tsx');
 const calls=[],point={label:'Acceso sintético revisable',lat:28.635300123,lng:-106.088900456};let confirmed=null;
 function Harness(){const [value,setValue]=useState(''),[selected,setSelected]=useState(null);return React.createElement(LocationInput,{title:'Origen',color:'green',value,selected,allowCurrentLocation:true,apiUrl:'/api',placeholder:'',onChange:setValue,onConfirm:next=>{confirmed=next;setSelected(next);}});}
 const markup=renderToString(React.createElement(Harness));
 const dom=new JSDOM('<div id="root">'+markup+'</div>',{url:'https://example.test',runScripts:'outside-only'});
 Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true}});
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;const savedFetch=globalThis.fetch;
 globalThis.fetch=async url=>{calls.push(url);return Response.json({ok:true,suggestions:[point]});};
 const input=document.querySelector('[role="combobox"]');assert.ok(input.matches(':disabled'));assert.match(document.body.textContent,/Preparando el buscador de origen/);
 for(const button of document.querySelectorAll('button'))assert.ok(button.matches(':disabled'));
 assert.match(markup,/Activa JavaScript/);assert.equal(calls.length,0);
 const {hydrateRoot}=await import('react-dom/client');let root;
 try{
  await act(async()=>{root=hydrateRoot(document.getElementById('root'),React.createElement(Harness));});
  assert.equal(input.matches(':disabled'),false);assert.doesNotMatch(document.querySelector('.location-field').textContent,/Preparando el buscador/);assert.equal(calls.length,0);
  const value='28.635300123,-106.088900456';await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new window.Event('input',{bubbles:true}));});
  await act(async()=>new Promise(resolve=>setTimeout(resolve,350)));
  assert.equal(input.value,value);assert.equal(new URL(calls[0],'https://example.test').searchParams.get('q'),value);assert.equal(confirmed,null);assert.equal(document.querySelector('.location-confirmed'),null);
  await act(async()=>document.querySelector('[role="option"]').click());assert.equal(confirmed,null);
  await act(async()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Confirmar punto').click());assert.deepEqual(confirmed,point);assert.equal(input.value,point.label);
 }finally{await act(async()=>root?.unmount());globalThis.fetch=savedFetch;dom.window.close();}
});
