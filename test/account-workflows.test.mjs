import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import React, { act, useState } from 'react';
const dom = new JSDOM('<html><body></body></html>', { url: 'https://route-planner.example.test' });
Object.defineProperties(globalThis, { window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true }, navigator: { value: dom.window.navigator, configurable: true } });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const oldChannel = globalThis.BroadcastChannel; globalThis.BroadcastChannel = undefined;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example.test'; process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-public-key';
const { createRoot } = await import('react-dom/client');
const { supabase } = await import('../lib/supabase.ts');
const { default: VehicleManager } = await import('../components/VehicleManager.tsx');
const { default: SavedRoutesPanel } = await import('../components/SavedRoutesPanel.tsx');
const { default: ManifestImport } = await import('../components/ManifestImport.tsx');
const { default: LocationInput } = await import('../components/LocationInput.tsx');
const { default: LocationBookProvider } = await import('../components/LocationBookProvider.tsx');
const { default: RouteExports } = await import('../components/RouteExports.tsx');
const savedFrom = supabase.from, savedFetch = globalThis.fetch;
let root, container, tables, writes, reads;
const user = { id: 'owner-one', email: 'owner@example.test' };
function database() {
  tables = { favorite_locations: [], profiles: [{ id: user.id, display_name: 'Operador' }], fleets: [], vehicles: [], saved_routes: [{ id: 'route-one', name: 'Entrega anterior', owner_id: user.id, status: 'planned', created_at: '2026-11-08', origin: { label: 'Origen' }, destination: { label: 'Destino' } }] }; writes = []; reads = [];
  supabase.from = table => {
    let filters = [], mode = 'read', values, singular = false;
    const query = {
      select(columns) { reads.push({ table, columns }); return query; }, order() { return query; }, limit() { return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      neq(key, value) { filters.push(row => row[key] !== value); return query; },
      abortSignal() { return query; },
      upsert(value) { mode = 'upsert'; values = value; return query; },
      insert(value) { mode = 'insert'; values = value; return query; },
      update(value) { mode = 'update'; values = value; return query; },
      single() { singular = true; return query; }, maybeSingle() { singular = true; return query; },
      then(resolve, reject) {
        let data = tables[table].filter(row => filters.every(filter => filter(row)));
        if (mode === 'upsert') { let row = tables[table].find(item => item.owner_id === values.owner_id && item.lat === values.lat && item.lng === values.lng); if (row) Object.assign(row, values); else { row = { id:'favorite-new', ...values }; tables[table].push(row); } data = [row]; writes.push({ table, values }); }
        if (mode === 'insert') { data = [{ id: 'vehicle-new', ...values }]; tables[table].push(...data); writes.push({ table, values }); }
        if (mode === 'update') { data.forEach(row => Object.assign(row, values)); writes.push({ table, values }); }
        return Promise.resolve({ data: singular ? data[0] || null : data.map(row => ({ ...row })), error: null }).then(resolve, reject);
      },
    }; return query;
  };
}
async function render(component) { container = document.createElement('div'); document.body.append(container); root = createRoot(container); await act(async () => root.render(component)); }
const button = text => [...container.querySelectorAll('button')].find(node => node.textContent.includes(text));
async function fill(input, value) { await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new window.Event('input', { bubbles: true })); }); }
afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); supabase.from = savedFrom; globalThis.fetch = savedFetch; });
after(async () => { await supabase.auth.stopAutoRefresh(); globalThis.BroadcastChannel = oldChannel; dom.window.close(); });

test('vehicle manager creates a reusable unit and allows editing without duplicating it', async () => {
  database(); let selected;
  function Harness() { const [vehicles, setVehicles] = useState([]); return React.createElement(VehicleManager, { user, vehicles, onSelect: id => { selected = id; }, onSaved: vehicle => { selected = vehicle.id; setVehicles(items => [vehicle, ...items.filter(item => item.id !== vehicle.id)]); } }); }
  await render(React.createElement(Harness));
  await act(async () => button('Agregar vehículo').click());
  await fill(container.querySelector('.vehicle-editor input'), 'Unidad 12 · ABC-123');
  await act(async () => container.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(selected, 'vehicle-new'); assert.equal(tables.vehicles.length, 1); assert.equal(tables.vehicles[0].owner_id, user.id); assert.equal(tables.vehicles[0].height_m, null);
  await act(async () => button('Editar').click()); await fill(container.querySelector('.vehicle-editor input'), 'Unidad 12 actualizada');
  await act(async () => container.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(tables.vehicles.length, 1); assert.equal(tables.vehicles[0].name, 'Unidad 12 actualizada');
});
test('deleting a saved route archives it; trash restores it without deleting data', async () => {
  database(); await render(React.createElement(SavedRoutesPanel, { user, revision: 0, onLoad: async () => {} }));
  assert.match(container.textContent, /Entrega anterior/);
  await act(async () => button('Eliminar').click());
  assert.equal(tables.saved_routes[0].status, 'archived'); assert.equal(container.querySelectorAll('.saved-route-card').length, 0);
  await act(async () => button('Papelera').click());
  assert.match(container.textContent, /Entrega anterior/);
  await act(async () => button('Recuperar').click());
  assert.equal(tables.saved_routes[0].status, 'planned'); assert.equal(tables.saved_routes.length, 1);
  await act(async () => button('Ver rutas activas').click()); assert.match(container.textContent, /Entrega anterior/);
});
test('manifest imports only explicitly confirmed points and searches one candidate at a time', async () => {
  let imported;
  globalThis.fetch = async () => Response.json({ suggestions: [{ label: 'Sucursal confirmada, Calle Uno 123', lat: 25.681, lng: -100.31 }] });
  await render(React.createElement(ManifestImport, { apiUrl: '/api', reference: { lat: 25.68, lng: -100.31 }, remaining: 8, hasDestination: true, onImport: points => { imported = points; } }));
  await act(async () => button('Escanear o pegar').click());
  const area = container.querySelector('textarea');
  await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, 'Calle Uno 123\nCalle Dos 456'); area.dispatchEvent(new window.Event('input', { bubbles: true })); });
  await act(async () => button('Preparar direcciones').click());
  assert.equal(container.querySelectorAll('.location-field').length, 1); assert.equal(button('Añadir 0 entregas').disabled, true);
  // Exclude the second delivery; the first still requires an explicit choice.
  await act(async () => container.querySelectorAll('.manifest-include input')[1].click());
  await act(async () => new Promise(resolve => setTimeout(resolve, 360)));
  await act(async () => container.querySelector('.location-suggestion').click());
  assert.equal(button('Añadir 0 entregas').disabled, true);
  await act(async () => button('Confirmar punto').click());
  assert.equal(button('Añadir 1 entregas').disabled, false);
  await act(async () => button('Añadir 1 entregas').click());
  assert.deepEqual(imported, [{ label: 'Sucursal confirmada, Calle Uno 123', lat: 25.681, lng: -100.31 }]);
});
test('nearby input forwards the reference and lets the operator disable proximity', async () => {
  const urls = []; globalThis.fetch = async url => { urls.push(new URL(url, window.location.href)); return Response.json({ suggestions: [] }); };
  await render(React.createElement(LocationInput, { title: 'Entrega', color: 'green', value: 'Bodega Aurrera Express', apiUrl: '/api', placeholder: '', mapReference: { lat: 25.68, lng: -100.31 }, onChange() {}, onConfirm() {} }));
  await act(async () => new Promise(resolve => setTimeout(resolve, 360)));
  assert.equal(urls[0].searchParams.get('lat'), '25.68');
  await act(async () => container.querySelector('.nearby-toggle input').click());
  await act(async () => new Promise(resolve => setTimeout(resolve, 360)));
  assert.equal(urls[1].searchParams.has('lat'), false);
});

test('saved-route list loads geometry and instructions only when opening a route', async () => {
  database(); let loaded;
  tables.saved_routes[0].route_metadata = { mode: 'truck', result: { distanceMeters: 123, durationSeconds: 90, sections: [] } };
  await render(React.createElement(SavedRoutesPanel, { user, revision: 0, onLoad: async route => { loaded = route; } }));
  assert.ok(reads[0].columns.includes('mode:route_metadata->>mode'));
  await act(async () => button('Cargar ruta').click());
  assert.ok(reads[1].columns.endsWith(',route_metadata'));
  assert.equal(loaded.route_metadata.result.distanceMeters, 123);
});

test('favorite workflow names and stores a confirmed branch, archives it, and restores without duplicates', async () => {
  database();
  const point = { label:'Bodega Aurrera Express, Monterrey',lat:25.721274,lng:-100.325989,plusCode:'75QXPMCF+GJ' };
  function Harness() { const [selected,setSelected]=useState(point); const [value,setValue]=useState(point.label); return React.createElement(LocationBookProvider,{user},React.createElement(LocationInput,{title:'Destino',color:'orange',value,selected,apiUrl:'/api',placeholder:'',onChange:setValue,onConfirm:setSelected})); }
  await render(React.createElement(Harness));
  await act(async()=>button('Guardar sucursal').click());
  await fill(container.querySelector('[aria-label="Nombre del favorito para Destino"]'),'Express · sucursal 1234');
  await act(async()=>button('Guardar favorito').click());
  assert.equal(tables.favorite_locations.length,1); assert.equal(tables.favorite_locations[0].name,'Express · sucursal 1234'); assert.equal(tables.favorite_locations[0].lat,point.lat);
  await act(async()=>button('Quitar de favoritos').click()); assert.equal(tables.favorite_locations[0].archived,true);
  await act(async()=>button('Guardar sucursal').click()); await act(async()=>button('Guardar favorito').click());
  assert.equal(tables.favorite_locations.length,1); assert.equal(tables.favorite_locations[0].archived,false);
});
test('recent branch can be reused without another geocoding call and cleared locally', async () => {
  database(); let networkCalls=0; globalThis.fetch=async()=>{networkCalls++;return Response.json({suggestions:[]});};
  window.localStorage.setItem('route-planner:recent-locations:v1:owner-one',JSON.stringify([{label:'Sucursal reciente',lat:25.721274,lng:-100.325989}]));
  function Harness() { const [selected,setSelected]=useState(null);const [value,setValue]=useState('');return React.createElement(LocationBookProvider,{user},React.createElement(LocationInput,{title:'Destino',color:'orange',value,selected,apiUrl:'/api',placeholder:'',onChange:setValue,onConfirm:setSelected})); }
  await render(React.createElement(Harness)); await act(async()=>button('Recientes y favoritos').click());
  await act(async()=>button('Sucursal reciente').click()); assert.equal(container.querySelector('.field input').value,'Sucursal reciente'); assert.equal(networkCalls,0);
  await act(async()=>button('Recientes y favoritos').click()); await act(async()=>button('Borrar recientes').click());
  assert.equal(window.localStorage.getItem('route-planner:recent-locations:v1:owner-one'),null);
});
test('export buttons prepare a downloadable file with the selected format',async t=>{
  const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL,oldClick=window.HTMLAnchorElement.prototype.click;
  let savedBlob,downloadName;
  URL.createObjectURL=blob=>{savedBlob=blob;return 'blob:test-route';};URL.revokeObjectURL=()=>{};
  window.HTMLAnchorElement.prototype.click=function(){downloadName=this.download;};
  t.after(()=>{URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;window.HTMLAnchorElement.prototype.click=oldClick;});
  await render(React.createElement(RouteExports,{truck:true,route:{distanceMeters:100,durationSeconds:60,sections:[],waypoints:[{type:'origin',label:'Origen',lat:25,lng:-100},{type:'destination',label:'Destino',lat:26,lng:-101}]}}));
  await act(async()=>button('GPX').click()); assert.match(downloadName,/\.gpx$/);assert.match(await savedBlob.text(),/<rtept lat="25" lon="-100">/);
});

test('planner retries a failed save with the same key and sends route and stops in one RPC',async t=>{
  database();
  const renderingErrors=[];t.mock.method(console,'error',(...args)=>renderingErrors.push(args.map(String).join(' ')));
  const {registerHooks}=await import('node:module');
  // Map rendering has its own integration tests; isolate this persistence flow.
  const hooks=registerHooks({load(url,context,next){if(url.endsWith('/components/RouteMap.tsx'))return {format:'module',source:'export default function RouteMap(){return null}',shortCircuit:true};return next(url,context);}});
  const oldUser=supabase.auth.getUser,oldSession=supabase.auth.getSession,oldAuthState=supabase.auth.onAuthStateChange,oldRpc=supabase.rpc;
  globalThis.React=React;
  supabase.auth.getUser=async()=>({data:{user},error:null});
  supabase.auth.getSession=async()=>({data:{session:{access_token:'test-session'}},error:null});
  supabase.auth.onAuthStateChange=()=>({data:{subscription:{unsubscribe(){}}}});
  const calls=[];
  supabase.rpc=async(name,args)=>{calls.push({name,args});return calls.length===1?{data:null,error:{message:'Connection interrupted'}}:{data:'saved-route-id',error:null};};
  t.after(()=>{hooks.deregister();supabase.auth.getUser=oldUser;supabase.auth.getSession=oldSession;supabase.auth.onAuthStateChange=oldAuthState;supabase.rpc=oldRpc;});
  globalThis.fetch=async(url)=>Response.json(url.endsWith('/v1/routes/plan')?{ok:true,route:{distanceMeters:1000,durationSeconds:180,sections:[],waypoints:[{type:'origin',label:'Origen',lat:28.66,lng:-106.09},{type:'stop',label:'Sucursal uno',lat:28.67,lng:-106.10},{type:'destination',label:'Destino',lat:28.68,lng:-106.11}]}}:{suggestions:[]});
  const {default:Home}=await import('../app/page.tsx');await render(React.createElement(Home));
  await fill(container.querySelectorAll('.route-form .field input')[0],'Origen de prueba');await fill(container.querySelectorAll('.route-form .field input')[1],'Destino de prueba');
  await act(async()=>button('Calcular ruta').click());
  await fill(container.querySelector('.route-save-name input'),'Express · ruta de prueba');
  await act(async()=>button('Guardar esta ruta').click());assert.match(container.textContent,/Connection interrupted/);
  await act(async()=>button('Guardar esta ruta').click());assert.match(container.textContent,/Ruta guardada en tu cuenta/);
  assert.equal(calls.length,2);assert.equal(calls[0].name,'save_route_with_stops');assert.equal(calls[0].args.p_request_id,calls[1].args.p_request_id);
  assert.equal(calls[1].args.p_stops[0].label,'Sucursal uno');assert.equal(calls[1].args.p_route.name,'Express · ruta de prueba');
  assert.deepEqual(renderingErrors,[]);
});
