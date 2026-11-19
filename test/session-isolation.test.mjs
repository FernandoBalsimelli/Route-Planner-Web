import assert from 'node:assert/strict';
import {test,after,afterEach} from 'node:test';
import React,{act} from 'react';
import {JSDOM} from 'jsdom';
import {registerHooks} from 'node:module';
const dom=new JSDOM('<!doctype html><body></body>',{url:'https://route-planner.example.test'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true},Element:{value:dom.window.Element,configurable:true},HTMLElement:{value:dom.window.HTMLElement,configurable:true},React:{value:React,configurable:true}});
dom.window.SVGSVGElement.prototype.createSVGRect=()=>({});window.scrollTo=()=>{};
const css=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {};',shortCircuit:true}:next(url,context);}});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const oldChannel=globalThis.BroadcastChannel;globalThis.BroadcastChannel=undefined;
process.env.NEXT_PUBLIC_SUPABASE_URL='https://auth.example.test';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test-public-key';
const {createRoot}=await import('react-dom/client');const {supabase}=await import('../lib/supabase.ts');
const {default:Home}=await import('../app/page.tsx');const {default:AccountPanel}=await import('../components/AccountPanel.tsx');const {default:SavedRoutesPanel}=await import('../components/SavedRoutesPanel.tsx');
const original={fetch:globalThis.fetch,from:supabase.from,rpc:supabase.rpc,getUser:supabase.auth.getUser,getSession:supabase.auth.getSession,onAuth:supabase.auth.onAuthStateChange};
const alice={id:'owner-a',email:'alice@example.test'},bob={id:'owner-b',email:'bob@example.test'};
const point=(label,lat=28.63)=>({label,lat,lng:-106.07});
const result={distanceMeters:1000,durationSeconds:100,sections:[],waypoints:[{...point('Private origin'),type:'origin'},{...point('Private destination',28.64),type:'destination'}]};
const stored={id:'route-a',name:'Private saved route',created_at:'2026-11-16',status:'planned',owner_id:alice.id,origin:point('Private origin'),destination:point('Private destination',28.64),route_metadata:{mode:'truck',result}};
let root,container,authUser,listeners,tables,reads,deferStops,deferDetails,deferVehicle;
function setup(){
 authUser=null;listeners=new Set();tables={vehicles:[],favorite_locations:[],saved_routes:[stored]};reads=[];deferStops=null;deferDetails=null;deferVehicle=null;
 supabase.auth.getUser=async()=>({data:{user:authUser},error:null});
 supabase.auth.getSession=async()=>({data:{session:authUser?{user:authUser,access_token:'synthetic-session'}:null},error:null});
 supabase.auth.onAuthStateChange=callback=>{listeners.add(callback);return {data:{subscription:{unsubscribe(){listeners.delete(callback);}}}};};
 supabase.from=table=>{
  const filters=[];let columns='',single=false,writing=false;const query={insert(){writing=true;return query;},select(value){columns=value;return query;},eq(k,v){filters.push([k,v]);return query;},neq(){return query;},order(){return query;},limit(){return query;},single(){single=true;return query;},maybeSingle(){single=true;return query;},abortSignal(){return query;},then(resolve,reject){
   reads.push({table,filters,columns});
   if(table==='vehicles'&&writing&&deferVehicle)return deferVehicle().then(resolve,reject);
   if(table==='route_stops'&&deferStops)return deferStops().then(resolve,reject);
   if(table==='saved_routes'&&single&&deferDetails)return deferDetails().then(resolve,reject);
   let data=(tables[table]||[]).filter(row=>filters.every(([k,v])=>row[k]===v));return Promise.resolve({data:single?data[0]:data,error:null}).then(resolve,reject);
  }};return query;
 };
 supabase.rpc=async()=>({data:'saved-id',error:null});
 globalThis.fetch=async url=>Response.json(url.endsWith('/v1/routes/plan')?{ok:true,route:result}:{ok:true,suggestions:[]});
}
async function render(node=React.createElement(Home)){container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(node));}
async function account(next,event=next?'SIGNED_IN':'SIGNED_OUT'){authUser=next;await act(async()=>{for(const callback of [...listeners])callback(event,next?{user:next,access_token:'synthetic-session'}:null);});}
function button(text){return [...container.querySelectorAll('button')].find(node=>node.textContent.includes(text));}
const input=title=>container.querySelector(`input[aria-label="${title}"]`);
async function fill(node,text){await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(node,text);node.dispatchEvent(new window.Event('input',{bubbles:true}));});}
async function planned(){await fill(input('Origen'),'Private origin');await fill(input('Destino'),'Private destination');await act(async()=>button('Calcular ruta').click());assert.ok(container.querySelector('.metrics'));}
afterEach(async()=>{await act(async()=>root?.unmount());root=null;container?.remove();globalThis.fetch=original.fetch;supabase.from=original.from;supabase.rpc=original.rpc;supabase.auth.getUser=original.getUser;supabase.auth.getSession=original.getSession;supabase.auth.onAuthStateChange=original.onAuth;});
after(async()=>{await supabase.auth.stopAutoRefresh();globalThis.BroadcastChannel=oldChannel;css.deregister();dom.window.close();});

test('guest input survives sign-in and token refresh, but signing out clears private route, vehicle and delivery draft',async()=>{
 setup();await render();await fill(input('Origen'),'Guest draft');await account(alice);assert.equal(input('Origen').value,'Guest draft');
 await act(async()=>button('Camión').click());await act(async()=>button('Agregar parada').click());await fill(input('PARADA 1'),'Private stop');await planned();
 await fill(container.querySelector('.route-save-name input'),'Private route name');
 await account(alice,'TOKEN_REFRESHED');assert.equal(input('Origen').value,'Private origin');assert.ok(container.querySelector('.metrics'));
 await account(null);assert.equal(input('Origen').value,'');assert.equal(input('Destino').value,'');assert.equal(input('PARADA 1'),null);assert.equal(container.querySelector('.metrics'),null);assert.equal(button('Reparto').getAttribute('aria-pressed'),'true');
});

test('late plan cannot repopulate another account after sign-out even when provider ignores abort',async()=>{
 setup();let complete,signal;globalThis.fetch=async(url,options)=>url.endsWith('/v1/routes/plan')?new Promise(resolve=>{complete=resolve;signal=options.signal;}):Response.json({ok:true,suggestions:[]});
 await render();await account(alice);await fill(input('Origen'),'Old origin');await fill(input('Destino'),'Old destination');await act(async()=>button('Calcular ruta').click());assert.ok(complete);
 await account(null);await account(bob);await fill(input('Origen'),'Bob draft');await act(async()=>complete(Response.json({ok:true,route:result})));
 assert.equal(signal.aborted,true);assert.equal(input('Origen').value,'Bob draft');assert.equal(input('Destino').value,'');assert.equal(container.querySelector('.metrics'),null);assert.equal(container.querySelector('.error-box'),null);
});

test('late saved stops cannot restore a route across sign-out and re-entry into the same account',async()=>{
 setup();let release;deferStops=()=>new Promise(resolve=>{release=resolve;});await render();await account(alice);await act(async()=>button('Mis rutas').click());await act(async()=>{button('Cargar ruta').click();});assert.ok(release);
 await account(null);await account(alice);await act(async()=>button('Planificar').click());await fill(input('Origen'),'New session draft');
 await act(async()=>release({data:[{sequence:0,location:point('Late private stop')}],error:null}));
 assert.equal(input('Origen').value,'New session draft');assert.equal(input('Destino').value,'');assert.equal(input('PARADA 1'),null);assert.equal(container.querySelector('.metrics'),null);
 assert.ok(reads.find(r=>r.table==='route_stops').filters.some(([k,v])=>k==='owner_id'&&v===alice.id));
});

test('late save error cannot publish old messages into another account',async()=>{
 setup();let release;supabase.rpc=()=>new Promise(resolve=>{release=resolve;});await render();await account(alice);await planned();await act(async()=>button('Guardar esta ruta').click());assert.ok(release);
 await account(null);await account(bob);await fill(input('Origen'),'Bob private draft');await act(async()=>release({data:null,error:{message:'OLD_ACCOUNT_SAVE_ERROR'}}));
 assert.equal(input('Origen').value,'Bob private draft');assert.equal(container.querySelector('.metrics'),null);await planned();assert.doesNotMatch(container.textContent,/OLD_ACCOUNT_SAVE_ERROR|Ruta guardada en tu cuenta/);
});

test('initial getUser result cannot replace a newer signed-out auth event',async()=>{
 setup();let release;const changes=[];supabase.auth.getUser=()=>new Promise(resolve=>{release=resolve;});await render(React.createElement(AccountPanel,{onUserChange:user=>changes.push(user?.id||null)}));
 await account(null);await act(async()=>release({data:{user:alice},error:null}));assert.deepEqual(changes,[null]);assert.match(container.textContent,/Iniciar sesión/);assert.doesNotMatch(container.textContent,/alice/);
});

test('unmounted saved-route panel ignores late detail responses instead of invoking its parent',async()=>{
 setup();let release,calls=0;deferDetails=()=>new Promise(resolve=>{release=resolve;});await render(React.createElement(SavedRoutesPanel,{user:alice,revision:0,onLoad:async()=>{calls++;}}));await act(async()=>{button('Cargar ruta').click();});assert.ok(release);
 await act(async()=>root.unmount());root=null;await act(async()=>release({data:stored,error:null}));assert.equal(calls,0);
});

test('late successful save from a previous session cannot confirm into a new session of the same account',async()=>{
 setup();let release;supabase.rpc=()=>new Promise(resolve=>{release=resolve;});await render();await account(alice);await planned();await act(async()=>button('Guardar esta ruta').click());assert.ok(release);
 await account(null);await account(alice);await planned();await act(async()=>release({data:'old-save-id',error:null}));
 assert.ok(container.querySelector('.metrics'));assert.doesNotMatch(container.textContent,/Ruta guardada en tu cuenta/);assert.equal(container.querySelector('.route-save-name input').value,'');
});

test('vehicle saved by an unmounted account editor cannot select its private unit in the next account',async()=>{
 setup();let release;deferVehicle=()=>new Promise(resolve=>{release=resolve;});await render();await account(alice);await act(async()=>button('Vehículos').click());await act(async()=>button('Agregar vehículo').click());await fill(container.querySelector('.vehicle-editor input'),'Private unit A');
 await act(async()=>container.querySelector('.vehicle-editor').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.ok(release);
 await account(null);await account(bob);await act(async()=>release({data:{id:'private-vehicle-a',name:'Private unit A',vehicle_type:'delivery',owner_id:alice.id},error:null}));
 assert.doesNotMatch(container.textContent,/Private unit A/);assert.equal(container.querySelector('.route-vehicle-selector select').value,'');
});


test('leaving saved routes discards pending stops instead of reopening the planner later',async()=>{
 setup();let release;deferStops=()=>new Promise(resolve=>{release=resolve;});await render();await account(alice);await act(async()=>button('Mis rutas').click());await act(async()=>{button('Cargar ruta').click();});assert.ok(release);
 await act(async()=>button('Vehículos').click());await act(async()=>release({data:[],error:null}));
 assert.equal(container.querySelector('.app-nav button[aria-current="page"]').textContent.includes('Vehículos'),true);
 await act(async()=>button('Planificar').click());assert.equal(input('Origen').value,'');assert.equal(input('Destino').value,'');assert.equal(container.querySelector('.metrics'),null);
});

test('loading changed saved points withdraws old metrics and navigation until a new calculation succeeds',async()=>{
 setup();const corrected=point('Acceso corregido',28.650001234);tables.route_stops=[{route_id:stored.id,owner_id:alice.id,sequence:1,location:corrected}];
 const before=JSON.stringify(tables);let requests=[];globalThis.fetch=async(url,options)=>{if(url.endsWith('/v1/routes/plan')){requests.push(JSON.parse(options.body));return Response.json({ok:true,route:{...result,waypoints:[result.waypoints[0],{...corrected,type:'stop'},result.waypoints[1]]}});}return Response.json({ok:true,suggestions:[]});};
 await render();await account(alice);await act(async()=>button('Mis rutas').click());await act(async()=>button('Cargar ruta').click());
 assert.equal(input('PARADA 1').value,corrected.label);assert.match(container.textContent,/ya no coinciden con el cálculo anterior/);assert.equal(container.querySelector('.metrics'),null);assert.equal(button('Guardar esta ruta'),undefined);assert.equal(container.querySelectorAll('.navigation-segments a').length,0);assert.equal(requests.length,0);
 await act(async()=>button('Calcular ruta').click());assert.ok(container.querySelector('.metrics'));assert.doesNotMatch(container.textContent,/ya no coinciden con el cálculo anterior/);assert.ok(button('Guardar esta ruta'));assert.equal(requests[0].stops[0].lat,corrected.lat);assert.equal(JSON.stringify(tables),before,'restoring/recalculating does not overwrite the original route or progress');
});

test('an incomplete saved stop order leaves the existing planner draft untouched',async()=>{
 setup();tables.route_stops=[{route_id:stored.id,owner_id:alice.id,sequence:2,location:point('No cargar parcialmente')}];
 await render();await account(alice);await fill(input('Origen'),'Mi borrador');await act(async()=>button('Mis rutas').click());await act(async()=>button('Cargar ruta').click());assert.match(container.textContent,/orden de las paradas guardadas está incompleto/);
 await act(async()=>button('Planificar').click());assert.equal(input('Origen').value,'Mi borrador');assert.equal(input('Destino').value,'');assert.equal(input('PARADA 1'),null);
});
