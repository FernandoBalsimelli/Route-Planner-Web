import assert from 'node:assert/strict';
import {test,after,afterEach} from 'node:test';
import React,{act,useState} from 'react';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html><body></body></html>',{url:'https://route-planner.example.test'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true}});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const oldChannel=globalThis.BroadcastChannel;globalThis.BroadcastChannel=undefined;
process.env.NEXT_PUBLIC_SUPABASE_URL='https://auth.example.test';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test-public-key';
const {createRoot}=await import('react-dom/client');
const {supabase}=await import('../lib/supabase.ts');
const {default:Provider,useLocationBook}=await import('../components/LocationBookProvider.tsx');
const {default:Tools}=await import('../components/LocationBookTools.tsx');
const {default:LocationInput}=await import('../components/LocationInput.tsx');
const {favoriteSearchFilter}=await import('../lib/favorite-search.ts');
const originalFrom=supabase.from,originalTimeout=globalThis.setTimeout,originalFetch=globalThis.fetch;
const alice={id:'alice'},bob={id:'bob'};
const row=(id,name,owner_id='alice',address_label='Calle Uno')=>({id,name,owner_id,address_label,archived:false,lat:28.635300123+Number(id.replace(/\D/g,'' )||0)*.00001,lng:-106.088900456,created_at:'2026-11-23'});
let root,container,rows,requests,intercept,picked;
function database(data){rows=data;requests=[];intercept=null;picked=null;supabase.from=table=>{
 const request={table,filters:[],orders:[],limit:0};
 const q={select(columns){request.columns=columns;return q;},eq(key,value){request.filters.push({key,value});return q;},or(value){request.or=value;return q;},order(key,options){request.orders.push([key,options]);return q;},limit(value){request.limit=value;return q;},abortSignal(signal){request.signal=signal;return q;},then(resolve,reject){
  requests.push(request);if(intercept){const deferred=intercept(request);if(deferred)return deferred.then(resolve,reject);}
  const pattern=request.or?JSON.parse(request.or.slice('name.imatch.'.length,request.or.indexOf(',address_label.imatch.'))):null;
  const regex=pattern?new RegExp(pattern,'i'):null;
  const data=rows.filter(row=>request.filters.every(f=>row[f.key]===f.value)&&(!regex||regex.test(row.name)||regex.test(row.address_label))).sort((a,b)=>b.id.localeCompare(a.id)).slice(0,request.limit);
  return Promise.resolve({data,error:null}).then(resolve,reject);
 }};return q;
};}
function Harness({user=alice}){const [open,setOpen]=useState(true);return React.createElement(Provider,{user},React.createElement(Tools,{title:'Destino',value:'Borrador intacto',open,selected:null,onToggle:()=>setOpen(v=>!v),onPick:value=>{picked=value;}}));}
async function render(user=alice){container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(Harness,{user})));await settle(10);}
const button=text=>[...container.querySelectorAll('button')].find(n=>n.textContent.includes(text));
const input=()=>container.querySelector('input[type="search"]');
async function fill(value){await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input(),value);input().dispatchEvent(new window.Event('input',{bubbles:true}));});}
const settle=(ms=330)=>act(async()=>new Promise(resolve=>originalTimeout(resolve,ms)));
afterEach(async()=>{await act(async()=>root?.unmount());container?.remove();supabase.from=originalFrom;globalThis.setTimeout=originalTimeout;globalThis.fetch=originalFetch;});
after(async()=>{await supabase.auth.stopAutoRefresh();globalThis.BroadcastChannel=oldChannel;dom.window.close();});

test('favorite filters independently quote PostgREST grammar and escape regex syntax',()=>{
 for(const value of ['50%_* (A)', 'a,b."c"\\d', '.*', '") or owner_id.eq.bob']){
  const filter=favoriteSearchFilter(value),pattern=JSON.parse(filter.slice(12,filter.indexOf(',address_label.imatch.')));
  assert.ok(new RegExp(pattern,'i').test(value));assert.equal(new RegExp(pattern,'i').test('unrelated'),false);
  assert.equal(filter,'name.imatch.'+JSON.stringify(pattern)+',address_label.imatch.'+JSON.stringify(pattern));
 }
 const filter=favoriteSearchFilter('bodega aurrera, pena'),pattern=JSON.parse(filter.slice(12,filter.indexOf(',address_label.imatch.')));
 assert.ok(new RegExp(pattern,'i').test('Bódega Aurrerá, Peña'));
});

function AddressHarness({user=alice,initial='Express 50%_* (A)'}){
 const [value,setValue]=useState(initial),[selected,setSelected]=useState(null);
 return React.createElement(Provider,{user},React.createElement(LocationInput,{title:'Destino',color:'orange',value,selected,placeholder:'',apiUrl:'/api/route-planner',mapReference:{lat:28.6353,lng:-106.0889},onChange:next=>{setValue(next);setSelected(null);},onConfirm:point=>{picked=point;setSelected(point);}}));
}
async function renderAddress(initial='Express 50%_* (A)'){
 container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(AddressHarness,{initial})));await settle(10);
}
test('opening saved branches transfers the current address search before provider debounce and finds older exact points account-wide',async()=>{
 const target=row('a1','Express 50%_* (A)','alice','Acceso guardado 123');database([...Array.from({length:55},(_,i)=>row('z'+i,'Otra sucursal')),target,row('foreign','Express 50%_* (A)','bob'),{...row('archive','Express 50%_* (A)'),archived:true}]);let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({suggestions:[]});};
 await renderAddress();await act(async()=>button('Recientes y favoritos').click());assert.equal(input().value,'Express 50%_* (A)');assert.equal(picked,null);await settle(350);
 assert.equal(calls,0);assert.equal(requests.at(-1).or,favoriteSearchFilter('Express 50%_* (A)'));assert.ok(button('★ Express 50%_* (A)'));assert.deepEqual(requests.at(-1).filters,[{key:'owner_id',value:'alice'},{key:'archived',value:false}]);
 assert.equal(container.querySelector('.field input').value,'Express 50%_* (A)');await act(async()=>button('★ Express 50%_* (A)').click());assert.deepEqual(picked,{label:target.address_label,lat:target.lat,lng:target.lng});assert.equal(container.querySelector('.field input').value,target.address_label);assert.equal(calls,0);assert.equal(container.querySelector('.location-book-list'),null);
 await act(async()=>button('Recientes y favoritos').click());assert.equal(input().value,'','a confirmed point opens the full book instead of inheriting its address as a filter');
});
test('a failed or distant public lookup offers explicit favorite recovery without confirming the wrong branch or replaying geocoding',async()=>{
 database([row('1','Express 50%_* (A)')]);let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({message:'Proveedor temporalmente no disponible',code:'PHOTON_UNAVAILABLE'},{status:503});};
 await renderAddress();await settle(350);assert.ok(button('Buscar en mis favoritos'));assert.equal(picked,null);await act(async()=>button('Buscar en mis favoritos').click());assert.equal(input().value,'Express 50%_* (A)');await settle();assert.ok(button('★ Express 50%_* (A)'));assert.equal(calls,1);assert.equal(picked,null);
 await act(async()=>button('Cerrar ubicaciones guardadas').click());globalThis.fetch=async()=>{calls++;return Response.json({suggestions:[{label:'Express lejana',lat:25.7,lng:-100.3}],warning:'NO_NEARBY_MATCHES'});};await settle(350);assert.ok(button('Buscar en mis favoritos'));assert.equal(container.querySelector('[role="option"]'),null);await act(async()=>button('Buscar en mis favoritos').click());await settle();assert.equal(calls,2);assert.equal(picked,null);assert.ok(button('★ Express 50%_* (A)'));
});
test('long address transfer discloses the favorite filter limit while retaining the complete unconfirmed delivery text',async()=>{
 const full='Calle '+('a'.repeat(150));database([]);globalThis.fetch=async()=>Response.json({suggestions:[]});await renderAddress(full);await act(async()=>button('Recientes y favoritos').click());assert.equal(input().value,full.slice(0,120));assert.match(container.textContent,/hasta 120 caracteres/);assert.equal(container.querySelector('.field input').value,full);assert.equal(picked,null);
});
test('favorite search runs before pagination, searches saved names and addresses, and preserves exact chosen coordinates',async()=>{
 const target=row('a1','Express 50%_* (A)','alice','Calle CEDRO 123');database([...Array.from({length:55},(_,i)=>row('z'+String(i).padStart(2,'0'),'Sucursal '+i)),target,row('foreign','Express 50%_* (A)','bob'),{...row('archive','Express 50%_* (A)'),archived:true}]);
 await render();assert.equal(requests.at(-1).limit,51);assert.ok(button('Cargar más favoritos'));assert.equal(button('★ Express 50%_* (A)'),undefined);
 await fill('50%_* (a)');assert.match(container.textContent,/Buscando/);assert.equal(picked,null);await settle();assert.ok(button('★ Express 50%_* (A)'));
 assert.equal(requests.at(-1).or,favoriteSearchFilter('50%_* (a)'));assert.deepEqual(requests.at(-1).filters,[{key:'owner_id',value:'alice'},{key:'archived',value:false}]);
 await act(async()=>button('★ Express 50%_* (A)').click());assert.equal(picked.lat,target.lat);assert.equal(picked.label,target.address_label);
 await fill('cedro 123');await settle();assert.ok(button('★ Express 50%_* (A)'));
 await fill('Sin coincidencia');await settle();assert.match(container.textContent,/No hay favoritos que coincidan/);
 await act(async()=>button('Limpiar búsqueda').click());await settle(10);assert.equal(input().value,'');assert.ok(button('Cargar más favoritos'));
 await act(async()=>button('Cargar más favoritos').click());await settle(10);assert.equal(requests.at(-1).limit,101);assert.ok(button('★ Express 50%_* (A)'));
});
test('favorite input debounces, cancels obsolete queries and ignores late responses after a new search',async()=>{
 database([row('1','Vieja'),row('2','Nueva')]);await render();let release;intercept=r=>r.or===favoriteSearchFilter('Vieja')?new Promise(resolve=>{release=resolve;}):null;
 await fill('V');await fill('Vi');await fill('Vieja');await settle();const old=requests.at(-1);assert.equal(requests.length,2);assert.ok(release);
 await fill('Nueva');assert.equal(old.signal.aborted,true);assert.equal(input().disabled,false);await settle();assert.ok(button('★ Nueva'));
 await act(async()=>release({data:[row('1','Vieja')],error:null}));assert.equal(button('★ Vieja'),undefined);
});
test('favorite failure preserves the query, shows a retry, and never claims an empty list',async()=>{
 database([row('1','Express')]);await render();intercept=()=>Promise.resolve({data:null,error:{message:'REST temporal'}});
 await fill('Express');await settle();assert.match(container.querySelector('[role="alert"]').textContent,/REST temporal/);assert.doesNotMatch(container.textContent,/No hay favoritos que coincidan/);
 intercept=null;await act(async()=>button('Reintentar favoritos').click());await settle();assert.equal(input().value,'Express');assert.ok(button('★ Express'));
});
test('a stalled favorite query releases loading and ignores its result after retry',async()=>{
 database([row('1','Express')]);let release;intercept=()=>new Promise(resolve=>{release=resolve;});globalThis.setTimeout=(fn,delay,...args)=>originalTimeout(fn,delay===30000?20:delay,...args);
 await render();await settle(30);assert.match(container.textContent,/tardó demasiado/);assert.doesNotMatch(container.textContent,/Buscando tus/);
 intercept=null;await act(async()=>button('Reintentar favoritos').click());await settle(10);assert.ok(button('★ Express'));
 await act(async()=>release({data:[row('late','No aplicar')],error:null}));assert.equal(button('★ No aplicar'),undefined);
});
test('changing favorite account clears search and cached names and ignores the previous owner',async()=>{
 database([row('1','Privada'),row('2','Segunda','bob')]);await render();let release;intercept=()=>new Promise(resolve=>{release=resolve;});await fill('Privada');await settle();const old=requests.at(-1);
 intercept=null;await act(async()=>root.render(React.createElement(Harness,{user:bob})));await settle(10);assert.equal(input().value,'');assert.equal(old.signal.aborted,true);assert.ok(button('★ Segunda'));
 await act(async()=>release({data:[row('1','Privada')],error:null}));assert.equal(button('★ Privada'),undefined);
});
