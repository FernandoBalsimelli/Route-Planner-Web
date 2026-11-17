import assert from 'node:assert/strict';
import {test,after,afterEach} from 'node:test';
import React,{act} from 'react';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html><body></body></html>',{url:'https://route-planner.example.test'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true}});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const oldChannel=globalThis.BroadcastChannel;globalThis.BroadcastChannel=undefined;
process.env.NEXT_PUBLIC_SUPABASE_URL='https://auth.example.test';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test-public-key';
const {createRoot}=await import('react-dom/client');
const {supabase}=await import('../lib/supabase.ts');
const {default:SavedRoutesPanel}=await import('../components/SavedRoutesPanel.tsx');
const {literalRouteNamePattern}=await import('../lib/saved-route-search.ts');
const originalFrom=supabase.from,originalTimeout=globalThis.setTimeout;
const alice={id:'alice'},bob={id:'bob'};
const route=(id,name,owner_id='alice',status='planned')=>({id,name,owner_id,status,created_at:'2026-11-16',origin:{label:'Patio público'},destination:{label:'Destino público'}});
let root,container,rows,requests,intercept;
function database(data){
 rows=data;requests=[];intercept=null;
 supabase.from=table=>{
  const request={table,filters:[],orders:[],limit:0};
  const q={select(columns){request.columns=columns;return q;},eq(key,value){request.filters.push({key,value,operator:'eq'});return q;},neq(key,value){request.filters.push({key,value,operator:'neq'});return q;},filter(key,operator,value){request.filters.push({key,operator,value});return q;},order(key,options){request.orders.push([key,options]);return q;},limit(value){request.limit=value;return q;},abortSignal(signal){request.signal=signal;return q;},then(resolve,reject){
   requests.push(request);
   if(intercept){const result=intercept(request);if(result)return result.then(resolve,reject);}
   let data=rows.filter(row=>request.filters.every(f=>f.operator==='eq'?row[f.key]===f.value:f.operator==='neq'?row[f.key]!==f.value:new RegExp(f.value,'i').test(row[f.key])));
   data=data.sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)).slice(0,request.limit);
   return Promise.resolve({data,error:null}).then(resolve,reject);
  }};return q;
 };
}
async function render(user=alice){container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(SavedRoutesPanel,{user,revision:0,onLoad:async()=>{}})));}
const input=()=>container.querySelector('input[type="search"]');
const button=text=>[...container.querySelectorAll('button')].find(n=>n.textContent.includes(text));
async function fill(value){await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input(),value);input().dispatchEvent(new window.Event('input',{bubbles:true}));});}
const settle=()=>act(async()=>new Promise(resolve=>originalTimeout(resolve,330)));
afterEach(async()=>{await act(async()=>root?.unmount());container?.remove();supabase.from=originalFrom;globalThis.setTimeout=originalTimeout;});
after(async()=>{await supabase.auth.stopAutoRefresh();globalThis.BroadcastChannel=oldChannel;dom.window.close();});

test('literal patterns keep regex characters, SQL wildcard characters and punctuation literal',()=>{
 const text='50%_* [2] (A) \\ + ? ^ $ . {x}|, "Express"';const pattern=literalRouteNamePattern('  '+text+'  ');
 assert.equal(new RegExp(pattern,'i').test('Ruta '+text.toUpperCase()),true);
 assert.equal(new RegExp(pattern,'i').test('Ruta 50XXXX diferente'),false);
 for(const value of ['.*','a|b','[abc]','(a+)+','\\d','^$','a{100}','%','_','*']){
  const regex=new RegExp(literalRouteNamePattern(value),'i');assert.equal(regex.test('Ruta '+value),true);assert.equal(regex.test('unrelated'),false);
 }
});

test('name search filters before pagination, preserves ownership and resets the page limit',async()=>{
 const name='Ruta 50%_* (A)';database([...Array.from({length:25},(_,i)=>route('z'+String(i).padStart(2,'0'),'Entrega '+i)),route('a-target',name),route('foreign',name,'bob')]);
 await render();assert.equal(container.querySelectorAll('.saved-route-card').length,20);assert.ok(button('Cargar más'));
 await act(async()=>button('Cargar más').click());assert.equal(container.querySelectorAll('.saved-route-card').length,26);
 await fill(name.toLowerCase());assert.equal(input().disabled,false);await settle();
 assert.equal(container.querySelectorAll('.saved-route-card').length,1);assert.match(container.textContent,/Ruta 50%_\* \(A\)/);
 const request=requests.at(-1);assert.equal(request.limit,21);assert.ok(request.filters.some(f=>f.key==='owner_id'&&f.value==='alice'));assert.ok(request.filters.some(f=>f.key==='name'&&f.operator==='imatch'&&f.value===literalRouteNamePattern(name.toLowerCase())));
 assert.equal(request.columns.includes(',route_metadata'),false);
 await act(async()=>button('Limpiar búsqueda').click());assert.equal(input().value,'');assert.equal(container.querySelectorAll('.saved-route-card').length,20);
});

test('editing remains enabled, debounces input and discards late results even if transport ignores abort',async()=>{
 database([route('old','Vieja'),route('new','Nueva')]);await render();let release;
 intercept=request=>request.filters.some(f=>f.value==='Vieja')?new Promise(resolve=>{release=resolve;}):null;
 await fill('V');await fill('Vi');await fill('Vieja');await settle();assert.ok(release);const previous=requests.at(-1);assert.equal(requests.length,2);
 await fill('Nueva');assert.equal(input().disabled,false);assert.equal(previous.signal.aborted,true);await settle();
 assert.equal(container.querySelectorAll('.saved-route-card').length,1);assert.match(container.textContent,/Nueva/);
 await act(async()=>release({data:[route('old','Vieja')],error:null}));assert.doesNotMatch(container.textContent,/Vieja/);
});

test('query errors have a retry instead of a misleading empty list and retain the name',async()=>{
 database([route('one','Express')]);await render();intercept=()=>Promise.resolve({data:null,error:{message:'Fallo sintético de REST'}});
 await fill('Express');await settle();assert.match(container.querySelector('[role="alert"]').textContent,/Fallo sintético/);assert.doesNotMatch(container.textContent,/No hay rutas activas/);
 intercept=null;await act(async()=>button('Reintentar búsqueda').click());await settle();assert.equal(input().value,'Express');assert.equal(container.querySelector('[role="alert"]'),null);assert.equal(container.querySelectorAll('.saved-route-card').length,1);
});

test('a stalled list stops loading and cannot replace a successful retry later',async()=>{
 database([route('one','Express')]);let release;intercept=()=>new Promise(resolve=>{release=resolve;});
 globalThis.setTimeout=(callback,delay,...args)=>originalTimeout(callback,delay===30000?15:delay,...args);
 await render();await act(async()=>new Promise(resolve=>originalTimeout(resolve,25)));
 assert.equal(container.querySelector('.saved-routes-list').getAttribute('aria-busy'),'false');assert.match(container.textContent,/tardó demasiado/);assert.equal(button('Reintentar búsqueda').disabled,false);
 intercept=null;await act(async()=>button('Reintentar búsqueda').click());assert.match(container.textContent,/Express/);
 await act(async()=>release({data:[route('late','No aplicar')],error:null}));assert.doesNotMatch(container.textContent,/No aplicar/);
});

test('changing account clears the search and ignores old account responses',async()=>{
 database([route('one','Primera'),route('two','Segunda','bob')]);await render();let release;
 intercept=()=>new Promise(resolve=>{release=resolve;});await fill('Primera');await settle();const old=requests.at(-1);
 intercept=null;await act(async()=>root.render(React.createElement(SavedRoutesPanel,{user:bob,revision:0,onLoad:async()=>{}})));
 assert.equal(input().value,'');assert.equal(old.signal.aborted,true);assert.match(container.textContent,/Segunda/);
 await act(async()=>release({data:[route('one','Primera')],error:null}));assert.doesNotMatch(container.textContent,/Primera/);
});
