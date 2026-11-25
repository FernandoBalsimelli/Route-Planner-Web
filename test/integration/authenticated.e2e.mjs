import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const base = 'http://127.0.0.1:4455';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.equal(supabaseUrl, 'http://127.0.0.1:54321', 'refuse to run this account fixture against hosted Supabase');
assert.equal(process.env.API_URL, 'http://127.0.0.1:4456');
const capture = resolve('_ci/ors-requests.jsonl');
const password = 'Synthetic-E2E-Password-2026!'; // Disposable, local accounts only.
let api, server, browser;
before(async () => {
  mkdirSync('_ci', { recursive: true }); rmSync(capture, { force: true });
  api = spawn(process.execPath, ['--import', resolve('test/integration/ors-fixture.mjs'), resolve('_ci/api/server.js')], { env: { ...process.env, PORT: '4456', SUPABASE_URL: supabaseUrl, SUPABASE_PUBLISHABLE_KEY: key, ORS_API_KEY: 'route-planner-synthetic-provider', RP_ORS_CAPTURE_FILE: capture }, stdio: 'ignore' });
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '4455', '-H', '127.0.0.1'], { stdio: 'ignore' });
  for (const url of [base, 'http://127.0.0.1:4456/health']) {
    let ready = false;
    for (let i=0; i<100; i++) { try { if ((await fetch(url)).ok) { ready=true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 200)); }
    assert.ok(ready, `server did not start: ${url}`);
  }
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); server?.kill('SIGTERM'); api?.kill('SIGTERM'); });
const nav = page => page.getByRole('navigation', { name: 'Secciones de Route Planner' });
async function createAccount(page, username) {
  await page.getByRole('button', { name: /Iniciar sesión/ }).click();
  await page.locator('.account-tabs').getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByLabel('Correo', { exact: true }).fill(`${username}@example.test`);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  const signup=page.waitForResponse(response=>response.url().includes('/auth/v1/signup')&&response.request().method()==='POST');
  await page.locator('form .account-submit').click();
  const response=await signup;assert.equal(response.status(),200,'local Auth must accept the browser signup');
  const payload=await response.json(),createdId=payload.user?.id||payload.id;assert.equal(typeof createdId,'string');
  await page.locator('.account-button').filter({hasText:username}).waitFor();
  if(await page.getByRole('dialog',{name:'Cuenta de Route Planner'}).isVisible())await page.locator('.account-button').click();
  return createdId;
}
async function point(page, title, value) {
  await page.getByRole('combobox', { name: title, exact: true }).fill(value);
  await page.getByRole('listbox', { name: `Sugerencias para ${title}` }).getByRole('option').click();
  await page.getByRole('button', { name: 'Confirmar punto', exact: true }).click();
}
async function session(username) {
  const client = createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.auth.signInWithPassword({ email: `${username}@example.test`, password });
  assert.equal(result.error, null, 'local Auth must issue a real session');
  return { client, uid: result.data.user.id };
}
async function createLocalAccount(username){
 const client=createClient(supabaseUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.signUp({email:username+'@example.test',password});assert.equal(error,null);assert.ok(data.session&&data.user);
 const profile=await client.from('profiles').upsert({id:data.user.id,display_name:username},{onConflict:'id',ignoreDuplicates:true});assert.equal(profile.error,null);
 return {client,uid:data.user.id};
}
async function rows(client, table) {
  const result = await client.from(table).select('*');
  assert.equal(result.error, null, `REST access to ${table} failed`);
  return result.data;
}

test('real local Auth, browser, proxy, API and RLS complete the vehicle and route lifecycle', { timeout: 180000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.route('https://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=', 'base64') }));
  await context.route('https://fonts.googleapis.com/**',route=>route.abort());
  await context.route('https://fonts.gstatic.com/**',route=>route.abort());
  const page = await context.newPage();
  let releaseSavedStops;
  try {
    await page.goto(base);
    const createdId=await createAccount(page, 'e2e-owner-one');
    const first = await session('e2e-owner-one');assert.equal(first.uid,createdId);
    let profiles=[];for(let i=0;i<20;i++){profiles=await rows(first.client,'profiles');if(profiles.some(row=>row.id===first.uid))break;await new Promise(resolve=>setTimeout(resolve,100));}
    assert.ok(profiles.some(row=>row.id===first.uid),'browser signup must prepare its own persistent profile');
    await nav(page).getByRole('button', { name: 'Vehículos', exact: true }).click();
    await page.getByRole('button', { name: 'Agregar vehículo' }).click();
    await page.getByLabel('Nombre o número de unidad', { exact: true }).fill('Unidad E2E 12');
    await page.getByLabel('Tipo de vehículo', { exact: true }).selectOption('truck');
    for (const [label,value] of [['Altura total (m)','4.1'],['Ancho (m)','2.5'],['Largo (m)','18'],['Peso bruto cargado (t)','38'],['Peso máximo por eje (t)','9']]) await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByLabel('Configuración vehicular', { exact: true }).selectOption('T3-S2');
    assert.equal(await page.getByLabel('Número total de ejes', { exact: true }).inputValue(), '5');
    assert.ok(await page.getByLabel('Número total de ejes', { exact: true }).getAttribute('readonly') !== null);
    await page.getByLabel('Capacidad máxima de carga (t)', { exact: true }).fill('30.125');
    await page.getByText('Flota (opcional)', { exact: true }).click();
    await page.getByLabel('Nueva flota', { exact: true }).fill('Flota E2E');
    await page.getByRole('button', { name: 'Crear flota', exact: true }).click();
    await page.getByRole('option', { name: 'Flota E2E', exact: true }).waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Guardar y usar vehículo', exact: true }).click();
    await page.getByRole('button', { name: 'Usar en ruta', exact: true }).click();
    assert.equal(await page.getByRole('spinbutton', { name: 'Altura (m)', exact: true }).inputValue(), '4.1');
    assert.ok((await rows(first.client, 'vehicles'))[0].fleet_id, 'the selected fleet is persisted');
    const storedVehicle = (await rows(first.client, 'vehicles'))[0];
    assert.equal(storedVehicle.axle_count, 5);
    assert.equal(storedVehicle.vehicle_configuration, 'T3-S2');
    assert.equal(storedVehicle.payload_capacity_t, 30.125);
    for (const invalid of [{axle_count:3},{vehicle_configuration:'unknown'},{payload_capacity_t:3.4999}]) {
      const rejected=await first.client.from('vehicles').update(invalid).eq('id',storedVehicle.id);
      assert.ok(rejected.error, 'real REST must enforce configuration and capacity constraints');
    }
    assert.equal((await rows(first.client,'vehicles'))[0].payload_capacity_t,30.125);
    const planAttempts=[];page.on('request',request=>{if(new URL(request.url()).pathname.endsWith('/v1/routes/plan'))planAttempts.push(request);});
    await page.getByRole('combobox',{name:'Origen',exact:true}).fill('Bodega Aurrera Express');
    await point(page, 'Destino', '28.63958, -106.08325');
    assert.ok(await page.getByRole('button',{name:'Calcular ruta',exact:true}).isDisabled());assert.equal(planAttempts.length,0);assert.equal(await page.locator('.navigation-segments a').count(),0);
    await point(page, 'Origen', '28.632995, -106.0691');
    await page.getByRole('button', { name: 'Agregar parada' }).click();
    assert.ok(await page.getByRole('button',{name:'Calcular ruta',exact:true}).isDisabled());await page.getByRole('button',{name:'Revisar parada 1',exact:true}).click();assert.ok(await page.getByRole('combobox',{name:'PARADA 1',exact:true}).evaluate(node=>node===document.activeElement));
    await page.getByRole('combobox',{name:'PARADA 1',exact:true}).fill('Entrega escrita sin confirmar');assert.ok(await page.getByRole('button',{name:'Calcular ruta',exact:true}).isDisabled());assert.equal(planAttempts.length,0);
    await point(page, 'PARADA 1', '28.64, -106.07');
    await page.getByRole('button', { name: 'Agregar parada' }).click();
    await point(page, 'PARADA 2', '28.65, -106.08');
    await page.getByRole('button', { name: 'Bajar parada 1', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Evitar casetas de peaje', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Evitar autopistas', exact: true }).check();
    const planResponse = page.waitForResponse(response => response.url().endsWith('/v1/routes/plan'));
    await page.getByRole('button', { name: 'Calcular ruta', exact: true }).click();
    const response = await planResponse;
    assert.equal(response.status(), 200, 'real bearer session must pass proxy and API Auth validation');
    const planned = (await response.json()).route;
    assert.equal(planAttempts.length,1);assert.equal(planAttempts[0].postDataJSON().stops.length,2);assert.ok(planAttempts[0].postDataJSON().stops.every(point=>typeof point.lat==='number'));
    assert.equal(planned.waypoints.length, 4);
    assert.equal(planned.vehicleContext.axleCount, 5);
    assert.equal(planned.vehicleContext.configuration, 'T3-S2');
    assert.equal(planned.vehicleContext.payloadCapacityT, 30.125);
    assert.equal(planned.waypoints[1].lat, 28.65);
    await page.getByText('3.4 km', { exact: true }).waitFor();
    const requests = readFileSync(capture, 'utf8').trim().split('\n').map(JSON.parse);
    assert.match(requests[0].path, /driving-hgv/);
    assert.deepEqual(requests[0].body.options.avoid_features, ['tollways', 'highways']);
    assert.deepEqual(planned.preferences, { avoidTolls: true, avoidHighways: true });
    assert.deepEqual(requests[0].body.options.profile_params.restrictions, { height: 4.1, width: 2.5, length: 18, weight: 38, axleload: 9 });
    await page.getByLabel('Nombre del recorrido', { exact: true }).fill('Entregas E2E Express');
    await page.getByRole('button', { name: 'Guardar esta ruta', exact: true }).click();
    await page.getByText('Ruta guardada en tu cuenta.', { exact: true }).waitFor();
    const saved = (await rows(first.client, 'saved_routes'))[0];
    assert.equal(saved.owner_id, first.uid);
    assert.equal(saved.vehicle_id, (await rows(first.client, 'vehicles'))[0].id);
    assert.equal(saved.route_metadata.mode, 'truck');
    assert.equal(saved.route_metadata.vehicle.axleCount, 5);
    assert.equal(saved.route_metadata.vehicle.configuration, 'T3-S2');
    assert.equal(saved.route_metadata.vehicle.payloadCapacityT, 30.125);
    assert.deepEqual(saved.route_metadata.result.preferences, { avoidTolls: true, avoidHighways: true });
    assert.equal((await rows(first.client, 'route_stops')).length, 2);
    const destination = page.locator('.location-field').filter({ has: page.getByRole('combobox', { name: 'Destino', exact: true }) });
    await destination.getByRole('button', { name: 'Guardar sucursal' }).click();
    await page.getByLabel('Nombre del favorito para Destino', { exact: true }).fill('Express E2E sucursal 1234');
    await destination.getByRole('button', { name: 'Guardar favorito', exact: true }).click();
    await page.getByText('Sucursal guardada en tus favoritos.', { exact: true }).waitFor();
    assert.equal((await rows(first.client, 'favorite_locations'))[0].name, 'Express E2E sucursal 1234');
    const changed=await first.client.from('vehicles').update({axle_count:6,vehicle_configuration:'T3-S3',payload_capacity_t:32}).eq('id',storedVehicle.id);
    assert.equal(changed.error,null);
    await page.reload();
    await nav(page).getByRole('button', { name: 'Mis rutas', exact: true }).click();
    await page.getByRole('button', { name: 'Eliminar ruta Entregas E2E Express', exact: true }).click();
    await page.getByText(/Ruta eliminada. Puedes recuperarla/).waitFor();
    assert.equal((await rows(first.client, 'saved_routes'))[0].status, 'archived');
    assert.equal((await rows(first.client, 'route_stops')).length, 2, 'archiving keeps every intermediate point');
    await page.getByRole('button', { name: 'Papelera', exact: true }).click();
    await page.getByRole('button', { name: 'Recuperar Entregas E2E Express', exact: true }).click();
    await page.getByText('Ruta recuperada.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ver rutas activas', exact: true }).click();
    await page.getByRole('button', { name: 'Cargar ruta', exact: true }).click();
    await page.getByText('3.4 km', { exact: true }).waitFor();
    assert.equal(await page.getByRole('combobox', { name: 'PARADA 1', exact: true }).inputValue(), planned.waypoints[1].label);
    assert.equal(await page.getByRole('spinbutton', { name: 'Peso bruto (t)', exact: true }).inputValue(), '38');
    assert.equal(await page.getByLabel('Configuración vehicular', { exact: true }).inputValue(), 'T3-S2', 'loading uses the historical snapshot, not the edited vehicle');
    assert.equal(await page.getByLabel('Número total de ejes', { exact: true }).inputValue(), '5');
    assert.equal(await page.getByLabel('Capacidad máxima de carga (t)', { exact: true }).inputValue(), '30.125');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.equal(await page.getByRole('checkbox', { name: 'Evitar casetas de peaje', exact: true }).isChecked(), true);
    assert.equal(await page.getByRole('checkbox', { name: 'Evitar autopistas', exact: true }).isChecked(), true);
    for (const href of await page.locator('.navigation-segments a').evaluateAll(nodes => nodes.map(node => node.href))) assert.equal(new URL(href).searchParams.get('avoid'), 'tolls,highways');
    await page.route('**/api/route-planner/v1/regulations/source-status',route=>route.fulfill({json:{sources:[],intervalHours:6,stale:false}}));
    await nav(page).getByRole('button',{name:'Guía camión',exact:true}).click();
    await page.getByRole('button',{name:'Consultar cobertura municipal',exact:true}).click();
    await page.getByLabel('Entidad federativa',{exact:true}).selectOption('21');
    await page.getByLabel('Municipio o demarcación',{exact:true}).selectOption('21114');
    await page.getByRole('heading',{name:'Puebla',exact:true}).waitFor();
    const capacityRule=page.locator('.municipal-time-rules article').filter({has:page.getByText('Maniobras: capacidad mayor de 3.5 t',{exact:true})});
    await capacityRule.locator('[data-comparison="matches"]').filter({hasText:'Capacidad de carga: 30.125 t'}).waitFor();
    const corridorCapacityRule=page.locator('.municipal-time-rules article').filter({has:page.getByText('Corredores del programa · capacidad mayor de 3.5 t',{exact:true})});
    await corridorCapacityRule.locator('[data-comparison="matches"]').filter({hasText:'Capacidad de carga: 30.125 t'}).waitFor();
    assert.match(await page.locator('.vehicle-review-context').innerText(),/T3-S2 · 5 ejes/);
    assert.match(await page.locator('.vehicle-reference-comparison').filter({hasText:'no se evalúa tu configuración'}).innerText(),/T3-S2/);
    await page.getByLabel('Entidad federativa',{exact:true}).selectOption('08');
    await page.getByLabel('Municipio o demarcación',{exact:true}).selectOption('08019');
    await page.getByRole('heading',{name:'Chihuahua',exact:true}).waitFor();
    await page.getByLabel('Procedencia de la referencia',{exact:true}).getByText('08/08/2026',{exact:true}).waitFor();
    const planning=page.locator('[data-evidence-kind="planning_proposal"]');
    assert.match(await planning.innerText(),/Propuesta de planeación · no es un horario vigente/);
    assert.equal(await planning.locator('.vehicle-reference-comparison').count(),0);
    assert.match(await planning.getByRole('link',{name:'Consultar página 390',exact:false}).getAttribute('href'),/PSMAMS.*#page=390$/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await nav(page).getByRole('button',{name:'Planificar',exact:true}).click();
    await page.getByRole('checkbox', { name: 'Evitar casetas de peaje', exact: true }).uncheck();
    await page.getByRole('checkbox', { name: 'Evitar autopistas', exact: true }).uncheck();
    // Reparto exercises the genuine API optimization request with a deterministic external fixture.
    await page.getByRole('button', { name: 'Reparto', exact: true }).click();
    await page.getByRole('checkbox', { name: /Optimizar orden de paradas/ }).check();
    const deliveryResponse = page.waitForResponse(response => response.url().endsWith('/v1/routes/plan'));
    await page.getByRole('button', { name: 'Calcular ruta', exact: true }).click();
    assert.equal((await deliveryResponse).status(), 200);
    await page.getByText('Orden de entregas optimizado por tiempo de viaje.', { exact: true }).waitFor();
    const last = readFileSync(capture, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(last[1].body.vehicles[0].profile, 'driving-car');
    assert.match(last[2].path, /driving-car/);
    assert.equal(last[2].body.options, undefined);
    // Hold a genuine REST response from account one across sign-out. The
    // database still enforces RLS; this checks that old browser work cannot
    // write its already-authorized data into the new account's draft.
    let stopsReady;
    const heldStops=new Promise(resolve=>{stopsReady=resolve;});
    const releaseStops=new Promise(resolve=>{releaseSavedStops=resolve;});
    await page.route('**/rest/v1/route_stops?**',async route=>{
      if(route.request().method()!=='GET')return route.continue();
      const response=await route.fetch();assert.equal(response.status(),200);
      stopsReady();await releaseStops;await route.fulfill({response});
    });
    await nav(page).getByRole('button',{name:'Mis rutas',exact:true}).click();
    await page.getByRole('button',{name:'Cargar ruta',exact:true}).click();await heldStops;
    await page.locator('.account-button').click();
    const logout=page.waitForResponse(response=>response.url().includes('/auth/v1/logout')&&response.request().method()==='POST');
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    assert.equal((await logout).status(),204);await page.locator('.account-button').filter({hasText:'Iniciar sesión'}).waitFor();
    if(await page.getByRole('dialog',{name:'Cuenta de Route Planner'}).isVisible())await page.locator('.account-button').click();
    await nav(page).getByRole('button',{name:'Planificar',exact:true}).click();
    assert.equal(await page.getByRole('combobox',{name:'Origen',exact:true}).inputValue(),'');
    assert.equal(await page.getByRole('combobox',{name:'Destino',exact:true}).inputValue(),'');
    assert.equal(await page.getByRole('combobox',{name:'PARADA 1',exact:true}).count(),0);
    assert.equal(await page.locator('.metrics').count(),0);
    await createAccount(page, 'e2e-owner-two');
    await nav(page).getByRole('button',{name:'Planificar',exact:true}).click();
    await page.getByRole('combobox',{name:'Origen',exact:true}).fill('Borrador segunda cuenta');
    const oldResponse=page.waitForResponse(response=>response.url().includes('/rest/v1/route_stops?')&&response.request().method()==='GET');
    releaseSavedStops();await oldResponse;
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.getByRole('combobox',{name:'Origen',exact:true}).inputValue(),'Borrador segunda cuenta');
    assert.equal(await page.getByRole('combobox',{name:'Destino',exact:true}).inputValue(),'');
    assert.equal(await page.locator('.metrics').count(),0);
    const second = await session('e2e-owner-two');
    assert.notEqual(first.uid, second.uid);
    await nav(page).getByRole('button', { name: 'Vehículos', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Usar en ruta', exact: true }).count(), 0);
    await nav(page).getByRole('button', { name: 'Mis rutas', exact: true }).click();
    await page.getByText('Todavía no has guardado recorridos.', { exact: true }).waitFor();
    for (const table of ['profiles','fleets','vehicles','saved_routes','route_stops','favorite_locations']) {
      const data = await rows(second.client, table);
      if (table === 'profiles') assert.ok(data.every(row => row.id === second.uid));
      else assert.deepEqual(data, [], `second account cannot read first account's ${table}`);
    }
    const forbidden = await second.client.from('vehicles').insert({ owner_id: first.uid, name: 'Forged ownership', vehicle_type: 'delivery' });
    assert.ok(forbidden.error, 'REST cannot forge another owner');
    const unauthorized = await fetch(base + '/api/route-planner/v1/routes/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(unauthorized.status, 401);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  } catch(error){console.error('Disposable fixture UI at failure:',(await page.locator('body').innerText().catch(()=>'' )).slice(-16000));throw error;} finally { releaseSavedStops?.();await context.close(); }
});

test('real local session plans and saves 48 deliveries atomically, retries without duplicates and rejects a 49th', {timeout:60000}, async()=>{
 const {client,uid}=await createLocalAccount('rpc-owner-one');
 const {data:auth,error}=await client.auth.getSession();assert.equal(error,null);const token=auth.session.access_token;
 const origin={label:'Patio sintético',lat:28.63,lng:-106.06},destination={label:'Destino sintético',lat:28.64,lng:-106.07};
 const stops=Array.from({length:48},(_,i)=>({label:`Entrega sintética ${i+1}`,lat:28.6301+i/100000,lng:-106.0601}));
 const payload={origin,destination,stops,mode:'truck',preferences:{avoidTolls:true,avoidHighways:true},vehicle:{heightM:4.1,widthM:2.5,lengthM:18,grossWeightT:38,axleWeightT:9,axleCount:5,configuration:'T3-S2',payloadCapacityT:30.125}};
 const plan=async body=>fetch(base+'/api/route-planner/v1/routes/plan',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(body)});
 const response=await plan(payload);assert.equal(response.status,200);const result=(await response.json()).route;assert.equal(result.waypoints.length,50);assert.deepEqual(result.waypoints.slice(1,-1).map(point=>point.label),stops.map(point=>point.label));
 const requestId=crypto.randomUUID(),route={name:'48 entregas reales en REST local',origin,destination,route_metadata:{mode:'truck',vehicle:payload.vehicle,result}};
 const save=async request=>client.rpc('save_route_with_stops',request);
 const saved=await save({p_request_id:requestId,p_route:route,p_stops:stops});assert.equal(saved.error,null);assert.equal(typeof saved.data,'string');
 const retried=await save({p_request_id:requestId,p_route:route,p_stops:stops});assert.equal(retried.error,null);assert.equal(retried.data,saved.data);
 const rowsResult=await client.from('route_stops').select('*').eq('route_id',saved.data).order('sequence');assert.equal(rowsResult.error,null);assert.equal(rowsResult.data.length,48);
 const savedRoute=await client.from('saved_routes').select('route_metadata').eq('id',saved.data).single();assert.equal(savedRoute.error,null);assert.deepEqual(savedRoute.data.route_metadata.result.preferences,payload.preferences);assert.deepEqual(savedRoute.data.route_metadata.vehicle,payload.vehicle);assert.deepEqual(result.vehicleContext,payload.vehicle);
 assert.ok(rowsResult.data.every(point=>point.owner_id===uid));assert.deepEqual(rowsResult.data.map(point=>point.location.label),stops.map(point=>point.label));
 const tooMany=[...stops,{label:'Entrega 49 rechazada',lat:28.64,lng:-106.07}];
 assert.equal((await plan({...payload,stops:tooMany})).status,400);
 const rejected=await save({p_request_id:crypto.randomUUID(),p_route:{...route,name:'No debe persistir 49 entregas'},p_stops:tooMany});assert.ok(rejected.error);
 const absent=await client.from('saved_routes').select('id').eq('name','No debe persistir 49 entregas');assert.equal(absent.error,null);assert.deepEqual(absent.data,[]);
 const second=await createLocalAccount('rpc-owner-two');const hidden=await second.client.from('route_stops').select('*').eq('route_id',saved.data);assert.equal(hidden.error,null);assert.deepEqual(hidden.data,[]);
 const reassign=await client.from('saved_routes').update({owner_id:second.uid}).eq('id',saved.data);assert.ok(reassign.error,'an owner cannot transfer a route to another account through REST');
});


test('real local session selects and saves an alternative geometry, then restores exactly that route', {timeout:60000}, async()=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.route('https://tile.openstreetmap.org/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=','base64')}));
 const page=await context.newPage();
 try{
  await page.goto(base);await createAccount(page,'alternative-owner');const owner=await session('alternative-owner');
  await page.getByRole('button',{name:'Camión',exact:true}).click();
  await point(page,'Origen','28.632995, -106.0691');await point(page,'Destino','28.63958, -106.08325');
  await page.getByRole('checkbox',{name:/Buscar rutas alternativas/}).check();
  await page.getByRole('checkbox',{name:'Evitar casetas de peaje',exact:true}).check();
  const responsePromise=page.waitForResponse(response=>response.url().endsWith('/v1/routes/plan'));
  await page.getByRole('button',{name:'Calcular ruta',exact:true}).click();const response=await responsePromise;assert.equal(response.status(),200);const payload=await response.json();assert.equal(payload.alternatives.length,1);
  const option=page.locator('.route-alternatives').getByRole('button',{name:/Ruta 2/});await option.click();assert.equal(await option.getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('.metrics').innerText(),/4.1 km/);
  await page.getByLabel('Nombre del recorrido',{exact:true}).fill('Alternativa elegida');
  await page.getByRole('button',{name:'Guardar esta ruta',exact:true}).click();await page.getByText('Ruta guardada en tu cuenta.',{exact:true}).waitFor();
  const saved=(await rows(owner.client,'saved_routes'))[0];assert.equal(saved.route_metadata.result.polyline,payload.alternatives[0].polyline);assert.equal(saved.route_metadata.result.distanceMeters,4100);assert.equal(saved.route_metadata.result.preferences.avoidTolls,true);
  const captured=readFileSync(capture,'utf8').trim().split('\n').map(JSON.parse).at(-1);assert.equal(captured.body.alternative_routes.target_count,3);assert.deepEqual(captured.body.options.avoid_features,['tollways']);assert.equal(captured.body.options.profile_params.restrictions.weight,40);
  await nav(page).getByRole('button',{name:'Mis rutas',exact:true}).click();await page.getByRole('button',{name:'Cargar ruta',exact:true}).click();await page.getByRole('heading',{name:'Detalle del recorrido',exact:true}).waitFor();
  assert.match(await page.locator('.metrics').innerText(),/4.1 km/);assert.equal(await page.locator('.route-alternatives').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 }finally{await context.close();}
});


test('real local saved-route search is literal, paginated and recoverable on mobile and desktop',{timeout:180000},async()=>{
 const {literalRouteNamePattern}=await import('../../lib/saved-route-search.ts');
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});
  await context.route('https://tile.openstreetmap.org/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=','base64')}));
  await context.route('https://fonts.googleapis.com/**',route=>route.abort());await context.route('https://fonts.gstatic.com/**',route=>route.abort());
  const page=await context.newPage();
  try{
   const username='saved-search-'+width;await page.goto(base);await createAccount(page,username);const owner=await session(username);
   const other=await createLocalAccount(username+'-other');
   const names=['Ruta 50%_* (A)','Calle [12]+?','Literal \\d^${x}.|','Coma, "Express"'];
   const origin={label:'Origen sintético',lat:28.63,lng:-106.06},destination={label:'Destino sintético',lat:28.64,lng:-106.07};
   const record=(name,created_at='2026-11-16T12:00:00Z')=>({owner_id:owner.uid,name,origin,destination,status:'planned',route_metadata:{mode:'delivery'},created_at});
   const seeds=[...Array.from({length:25},(_,i)=>record('Entrega normal '+String(i).padStart(2,'0'))),...names.map(name=>record(name,'2020-01-01T00:00:00Z')),record('Ruta 50XXX cualquier A')];
   const saved=await owner.client.from('saved_routes').insert(seeds).select('id,name');assert.equal(saved.error,null);assert.equal(saved.data.length,30);
   const foreign=await other.client.from('saved_routes').insert({...record(names[0]),owner_id:other.uid}).select('id').single();assert.equal(foreign.error,null);
   const hidden=await owner.client.from('saved_routes').select('id').eq('id',foreign.data.id).filter('name','imatch',literalRouteNamePattern(names[0]));assert.equal(hidden.error,null);assert.deepEqual(hidden.data,[]);
   await nav(page).getByRole('button',{name:'Mis rutas',exact:true}).click();await page.getByRole('button',{name:'Cargar más rutas',exact:true}).waitFor();
   assert.equal(await page.locator('.saved-route-card').count(),20);assert.equal(await page.locator('.saved-route-card').filter({hasText:names[0]}).count(),0);
   const moreResponse=page.waitForResponse(response=>{const u=new URL(response.url());return u.pathname.endsWith('/rest/v1/saved_routes')&&u.searchParams.get('limit')==='41';});
   await page.getByRole('button',{name:'Cargar más rutas',exact:true}).click();const more=await moreResponse;assert.equal(more.status(),200);assert.equal((await more.json()).length,30);await page.locator('.saved-route-card').nth(29).waitFor();assert.equal(await page.locator('.saved-route-card').count(),30);
   const input=page.getByRole('searchbox',{name:'Buscar rutas por nombre',exact:true});
   for(const name of names){
    const term=name.toLowerCase();const responsePromise=page.waitForResponse(response=>{const u=new URL(response.url());return u.pathname.endsWith('/rest/v1/saved_routes')&&u.searchParams.get('name')==='imatch.'+literalRouteNamePattern(term);});
    await input.fill(term);const response=await responsePromise;assert.equal(response.status(),200);const results=await response.json();assert.equal(results.length,1);assert.equal(results[0].name,name);
    const url=new URL(response.url());assert.equal(url.searchParams.get('limit'),'21');assert.equal(url.searchParams.get('owner_id'),'eq.'+owner.uid);assert.equal(url.searchParams.get('select').includes(',route_metadata'),false);
    await page.locator('.saved-route-card').getByText(name,{exact:true}).waitFor();assert.equal(await page.locator('.saved-route-card').count(),1);assert.equal(await page.locator('.saved-route-card strong').innerText(),name);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   }
   await input.fill('No existe esta ruta');await page.getByText('No hay rutas activas con este nombre.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Limpiar búsqueda',exact:true}).click();await page.getByRole('button',{name:'Cargar más rutas',exact:true}).waitFor();assert.equal(await input.inputValue(),'');assert.equal(await page.locator('.saved-route-card').count(),20);
   await input.fill(names[0]);await page.getByRole('button',{name:'Eliminar ruta '+names[0],exact:true}).click();await page.getByText(/Ruta eliminada. Puedes recuperarla/).waitFor();
   await page.getByRole('button',{name:'Papelera',exact:true}).click();const recover=page.getByRole('button',{name:'Recuperar '+names[0],exact:true});await recover.waitFor();assert.equal(await input.inputValue(),names[0]);await recover.click();await page.getByText('No hay rutas en la papelera con este nombre.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Ver rutas activas',exact:true}).click();await page.getByRole('button',{name:'Cargar ruta',exact:true}).click();
   assert.equal(await page.getByRole('combobox',{name:'Origen',exact:true}).inputValue(),origin.label);assert.equal(await page.getByRole('combobox',{name:'Destino',exact:true}).inputValue(),destination.label);
   const preserved=await owner.client.from('saved_routes').select('id,status').eq('name',names[0]);assert.equal(preserved.error,null);assert.equal(preserved.data.length,1);assert.equal(preserved.data[0].status,'planned');
  }finally{await context.close();}
 }
});

test('real local favorite search finds older branches by literal name or address and preserves account isolation on mobile and desktop',{timeout:180000},async()=>{
 const {favoriteSearchFilter}=await import('../../lib/favorite-search.ts');
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});
  await context.route('https://tile.openstreetmap.org/**',route=>route.abort());
  const page=await context.newPage();
  try{
   const username='favorite-search-'+width;await page.goto(base);await createAccount(page,username);const owner=await session(username),other=await createLocalAccount(username+'-other');
   const names=['Express 50%_* (A)','Calle [12]+?','Literal \\d^${x}.|','Coma, "Express"','Bodega Aurrerá · Peña'];
   const record=(name,i,created_at='2026-11-16T12:00:00Z')=>({owner_id:owner.uid,name,address_label:i===100?'Calle Cedro 123':'Dirección sintética '+i,lat:28.635300123+i*.00001,lng:-106.088900456,archived:false,created_at});
   const seeds=[...Array.from({length:55},(_,i)=>record('Sucursal normal '+String(i).padStart(2,'0'),i)),...names.map((name,i)=>record(name,100+i,'2020-01-01T00:00:00Z')),record('Express 50XXX cualquier A',200),{...record(names[0],201),archived:true}];
   const inserted=await owner.client.from('favorite_locations').insert(seeds).select('id,name,lat,lng');assert.equal(inserted.error,null);assert.equal(inserted.data.length,62);
   const foreign=await other.client.from('favorite_locations').insert({...record(names[0],300),owner_id:other.uid}).select('id').single();assert.equal(foreign.error,null);
   const hidden=await owner.client.from('favorite_locations').select('id').eq('id',foreign.data.id).or(favoriteSearchFilter(names[0]));assert.equal(hidden.error,null);assert.deepEqual(hidden.data,[]);
   await page.reload();await page.locator('.account-button').filter({hasText:username}).waitFor();await page.getByRole('combobox',{name:'Destino',exact:true}).fill('Borrador que no debe cambiar');
   const field=page.locator('.location-field').filter({has:page.getByRole('combobox',{name:'Destino',exact:true})});
   await field.getByRole('button',{name:'☆ Recientes y favoritos',exact:true}).click();
   const region=page.getByRole('region',{name:'Ubicaciones guardadas para Destino',exact:true});
   assert.equal(await region.getByRole('searchbox',{name:'Buscar favoritos para Destino',exact:true}).inputValue(),'Borrador que no debe cambiar');
   await region.getByRole('button',{name:'Limpiar búsqueda de favoritos',exact:true}).click();
   await region.getByRole('button',{name:'Cargar más favoritos',exact:true}).waitFor();assert.equal(await region.getByRole('button',{name:/^★ /}).count(),50);
   assert.equal(await region.getByRole('button',{name:new RegExp('^★ Express 50%')}).count(),0);
   const search=region.getByRole('searchbox',{name:'Buscar favoritos para Destino',exact:true});
   for(const name of names){
    const term=name.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();const responsePromise=page.waitForResponse(response=>{const u=new URL(response.url());return u.pathname.endsWith('/rest/v1/favorite_locations')&&u.searchParams.get('or')==='('+favoriteSearchFilter(term)+')';});
    await search.fill(term);const response=await responsePromise;assert.equal(response.status(),200);const found=await response.json();assert.equal(found.length,1);assert.equal(found[0].name,name);
    const url=new URL(response.url());assert.equal(url.searchParams.get('owner_id'),'eq.'+owner.uid);assert.equal(url.searchParams.get('archived'),'eq.false');assert.equal(url.searchParams.get('limit'),'51');
    await region.getByRole('button',{name:/^★ /}).filter({hasText:name}).waitFor();assert.equal(await region.getByRole('button',{name:/^★ /}).count(),1);assert.equal(await page.getByRole('combobox',{name:'Destino',exact:true}).inputValue(),'Borrador que no debe cambiar');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   }
   await search.fill('cedro 123');const selected=region.getByRole('button',{name:/^★ Express 50%/});await selected.waitFor();await selected.click();
   assert.equal(await page.getByRole('combobox',{name:'Destino',exact:true}).inputValue(),'Calle Cedro 123');await field.getByText('✓ Punto confirmado',{exact:false}).waitFor();
   const target=inserted.data.find(row=>row.name===names[0]);const map=field.getByRole('button',{name:'★ Quitar de favoritos',exact:true});await map.waitFor();
   await field.getByRole('button',{name:'☆ Recientes y favoritos',exact:true}).click();assert.equal(await search.inputValue(),'');await region.getByRole('button',{name:'Cargar más favoritos',exact:true}).waitFor();
   assert.equal(await field.getByRole('button',{name:'★ Quitar de favoritos',exact:true}).count(),1,'searching another page must not forget the selected favorite');
   const stored=await owner.client.from('favorite_locations').select('id,name,lat,lng').eq('id',target.id).single();assert.equal(stored.error,null);assert.equal(stored.data.name,names[0]);assert.equal(stored.data.lat,target.lat);
  }finally{await context.close();}
 }
});

test('public lookup failures and distant results recover into exact account-wide saved branch search without replaying geocoding',{timeout:180000},async()=>{
 const {favoriteSearchFilter}=await import('../../lib/favorite-search.ts');
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});await context.route('https://tile.openstreetmap.org/**',route=>route.abort());const page=await context.newPage();let geocoding=0;
  try{
   const username='favorite-recovery-'+width;await page.goto(base);await createAccount(page,username);const owner=await session(username),other=await createLocalAccount(username+'-other');
   const name='Express 50%_* (A)',target={owner_id:owner.uid,name,address_label:'Acceso de prueba Cedro 123',lat:28.635300123,lng:-106.088900456,archived:false,created_at:'2020-01-01T00:00:00Z'};
   const seed=await owner.client.from('favorite_locations').insert([...Array.from({length:55},(_,i)=>({...target,name:'Sucursal '+i,lat:28.64+i/10000,created_at:'2026-11-24T00:00:00Z'})),target]);assert.equal(seed.error,null);
   assert.equal((await other.client.from('favorite_locations').insert({...target,owner_id:other.uid,address_label:'Acceso de otra cuenta',lat:29})).error,null);
   await page.reload();await page.locator('.account-button').filter({hasText:username}).waitFor();
   await page.route('**/api/route-planner/v1/locations/suggest?**',route=>{geocoding++;return width===390?route.fulfill({status:503,json:{ok:false,code:'PHOTON_UNAVAILABLE',message:'Proveedor sintético temporalmente no disponible'}}):route.fulfill({json:{ok:true,suggestions:[{label:'Express lejana de prueba',lat:25.7,lng:-100.3}],warning:'NO_NEARBY_MATCHES'}});});
   const input=page.getByRole('combobox',{name:'Destino',exact:true}),field=page.locator('.location-field').filter({has:input});await input.fill(name);await field.getByRole('button',{name:'Buscar en mis favoritos',exact:true}).waitFor();assert.equal(geocoding,1);assert.equal(await field.locator('.location-confirmed').count(),0);
   const responsePromise=page.waitForResponse(response=>{const u=new URL(response.url());return u.pathname.endsWith('/rest/v1/favorite_locations')&&u.searchParams.get('or')==='('+favoriteSearchFilter(name)+')';});
   await field.getByRole('button',{name:'Buscar en mis favoritos',exact:true}).click();const response=await responsePromise;assert.equal(response.status(),200);const found=await response.json();assert.equal(found.length,1);assert.equal(found[0].address_label,target.address_label);assert.equal(new URL(response.url()).searchParams.get('owner_id'),'eq.'+owner.uid);
   const region=page.getByRole('region',{name:'Ubicaciones guardadas para Destino',exact:true});assert.equal(await region.getByRole('searchbox').inputValue(),name);assert.equal(await input.inputValue(),name);assert.equal(await field.locator('.location-confirmed').count(),0);assert.equal(geocoding,1);
   await region.getByRole('button',{name:/^★ Express 50%/}).click();assert.equal(await input.inputValue(),target.address_label);await field.getByText('✓ Punto confirmado',{exact:false}).waitFor();assert.equal(geocoding,1);assert.equal(await region.count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.equal(found[0].lat,target.lat);assert.equal(found[0].lng,target.lng);const stored=await owner.client.from('favorite_locations').select('lat,lng,address_label').eq('name',name).single();assert.equal(stored.error,null);assert.equal(stored.data.lat,target.lat);assert.equal(stored.data.lng,target.lng);assert.equal(stored.data.address_label,target.address_label);
  }finally{await context.close();}
 }
});

test('real local bearer sharing preserves 48 deliveries, requires review, isolates owners and honors revoke/archive', {timeout:120000}, async()=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const recipients=[];await context.route('https://tile.openstreetmap.org/**',route=>route.abort());
 const page=await context.newPage();
 try{
  await page.goto(base);await createAccount(page,'share-owner');const owner=await session('share-owner'),other=await createLocalAccount('share-other');
  const origin={label:'Patio sintético compartido',lat:28.632995,lng:-106.0691},destination={label:'Destino sintético compartido',lat:28.63958,lng:-106.08325};
  const stops=Array.from({length:48},(_,i)=>({label:`Entrega compartida ${i+1}`,lat:28.633+i/100000,lng:-106.07}));
  const vehicle={heightM:4.1,widthM:2.5,lengthM:18,grossWeightT:38,axleWeightT:9,axleCount:5,configuration:'T3-S2',payloadCapacityT:30.125};
  const saved=await owner.client.rpc('save_route_with_stops',{p_request_id:crypto.randomUUID(),p_route:{name:'Enlace sintético 48 entregas',origin,destination,route_metadata:{mode:'truck',vehicle,result:{polyline:'PRIVATE_GEOMETRY',preferences:{avoidTolls:true,avoidHighways:false}}}},p_stops:stops});assert.equal(saved.error,null);
  await nav(page).getByRole('button',{name:'Mis rutas',exact:true}).click();await page.getByRole('button',{name:'Compartir puntos',exact:true}).click();
  const manager=page.getByRole('region',{name:'Compartir puntos de la ruta'});await manager.getByText('No hay enlaces para esta ruta.',{exact:true}).waitFor();
  assert.equal(await manager.getByRole('button',{name:'Crear enlace',exact:true}).isDisabled(),true);
  await manager.getByRole('checkbox').check();await manager.getByRole('button',{name:'Crear enlace',exact:true}).click();
  const urlInput=manager.getByLabel('Enlace para compartir',{exact:true});await urlInput.waitFor();const url=await urlInput.inputValue(),token=new URL(url).hash.slice('#compartir='.length);
  assert.match(token,/^[a-f0-9]{64}$/);assert.equal(new URL(url).search,'');
  const anon=createClient(supabaseUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const read=await anon.rpc('read_route_share_link',{p_token:token});assert.equal(read.error,null);assert.equal(read.data.draft.stops.length,48);assert.equal(read.data.draft.stops[47].label,stops[47].label);assert.equal(JSON.stringify(read.data).includes('PRIVATE_GEOMETRY'),false);assert.equal(read.data.draft.owner_id,undefined);
  const metadata=await owner.client.from('route_share_links').select('id,owner_id,route_id,expires_at,revoked_at');assert.equal(metadata.error,null);assert.equal(metadata.data.length,1);
  assert.ok((await owner.client.from('route_share_links').select('token_hash,snapshot')).error);assert.ok((await anon.from('route_share_links').select('id')).error);
  const foreignList=await other.client.from('route_share_links').select('id');assert.equal(foreignList.error,null);assert.deepEqual(foreignList.data,[]);
  assert.equal((await other.client.rpc('revoke_route_share_link',{p_share_id:metadata.data[0].id})).data,false);assert.ok((await other.client.rpc('create_route_share_link',{p_route_id:saved.data,p_expires_hours:24})).error);
  for(const width of [390,1365]){
   const receiver=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});recipients.push(receiver);
   await receiver.route('https://tile.openstreetmap.org/**',route=>route.abort());const incoming=await receiver.newPage();let calculations=0;
   incoming.on('request',request=>{if(request.url().endsWith('/v1/routes/plan'))calculations++;});
   await incoming.goto(url);await incoming.getByRole('heading',{name:'Enlace sintético 48 entregas',exact:true}).waitFor();
   assert.equal(await incoming.locator('.shared-route-points li').count(),50);assert.match(await incoming.locator('.shared-route-review').innerText(),/4.1 m de alto/);assert.equal(calculations,0);
   assert.ok(await incoming.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await incoming.getByRole('button',{name:'Usar estos puntos',exact:true}).click();await incoming.getByRole('combobox',{name:'Origen',exact:true}).waitFor();
   assert.equal(await incoming.getByRole('combobox',{name:'Origen',exact:true}).inputValue(),origin.label);assert.equal(await incoming.getByRole('combobox',{name:'PARADA 48',exact:true}).inputValue(),stops[47].label);
   assert.equal(await incoming.getByRole('spinbutton',{name:'Altura (m)',exact:true}).inputValue(),'4.1');assert.equal(await incoming.getByRole('checkbox',{name:'Evitar casetas de peaje',exact:true}).isChecked(),true);
   assert.equal(await incoming.locator('.metrics').count(),0);assert.equal(calculations,0);assert.equal(new URL(incoming.url()).hash,'#planificador');
   await incoming.getByRole('combobox',{name:'Origen',exact:true}).fill('Borrador conservado');
   await incoming.evaluate(hash=>{window.location.hash=hash;},new URL(url).hash);await incoming.getByRole('heading',{name:'Enlace sintético 48 entregas',exact:true}).waitFor();
   // Revocation must be rechecked on import, after a recipient already opened it.
   if(width===1365){
    await manager.getByRole('button',{name:'Revocar enlace',exact:true}).click();await manager.getByText(/Enlace revocado\./).waitFor();
    assert.equal((await anon.rpc('read_route_share_link',{p_token:token})).data,null);
    await incoming.getByRole('button',{name:'Usar estos puntos',exact:true}).click();await incoming.getByRole('alert').filter({hasText:'El enlace no está disponible'}).waitFor();
    assert.equal(await incoming.getByRole('button',{name:'Usar estos puntos',exact:true}).count(),0);
   }
   await incoming.getByRole('button',{name:'Cerrar sin importar',exact:true}).click();
   assert.equal(await incoming.getByRole('combobox',{name:'Origen',exact:true}).inputValue(),'Borrador conservado');
   assert.equal(await incoming.locator('.metrics').count(),0);
  }
  await manager.getByRole('checkbox').check();await manager.getByRole('button',{name:'Crear enlace',exact:true}).click();await urlInput.waitFor();const secondToken=new URL(await urlInput.inputValue()).hash.slice('#compartir='.length);
  await page.getByRole('button',{name:'Eliminar ruta Enlace sintético 48 entregas',exact:true}).click();await page.getByText(/Ruta eliminada. Puedes recuperarla/).waitFor();
  assert.equal((await anon.rpc('read_route_share_link',{p_token:secondToken})).data,null);
  const recovered=await owner.client.from('saved_routes').update({status:'planned'}).eq('id',saved.data);assert.equal(recovered.error,null);
  assert.equal((await anon.rpc('read_route_share_link',{p_token:secondToken})).data,null,'restoring must not reactivate bearer links');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }catch(error){console.error('Disposable share fixture UI at failure:',(await page.locator('body').innerText().catch(()=>'' )).replace(/#compartir=[a-f0-9]+/g,'#compartir=[redacted]').slice(-10000));throw error;}
 finally{for(const receiver of recipients)await receiver.close();await context.close();}
});

test('real local saved route resumes Google links from a selected delivery without losing subsequent stops or changing the saved route',{timeout:120000},async()=>{
 for(const width of [390,1365]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});await context.route('https://tile.openstreetmap.org/**',r=>r.abort());const page=await context.newPage();
  try{
   const username='resume-owner-'+width;await page.goto(base);await createAccount(page,username);const {client}=await session(username);const auth=await client.auth.getSession();
   const origin={label:'Origen sintético',lat:28.63,lng:-106.06},destination={label:'Destino sintético',lat:28.64,lng:-106.07};
   const stops=Array.from({length:48},(_,i)=>({label:'Entrega sintética '+(i+1),lat:28.6301+i/100000,lng:-106.0601}));
   const vehicle={heightM:4.1,widthM:2.5,lengthM:18,grossWeightT:38,axleWeightT:9};
   const response=await fetch(base+'/api/route-planner/v1/routes/plan',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+auth.data.session.access_token},body:JSON.stringify({origin,destination,stops,mode:'truck',vehicle,preferences:{avoidTolls:true,avoidHighways:true}})});assert.equal(response.status,200);const result=(await response.json()).route;
   const saved=await client.rpc('save_route_with_stops',{p_request_id:crypto.randomUUID(),p_route:{name:'Continuar 48 entregas',origin,destination,route_metadata:{mode:'truck',vehicle,result}},p_stops:stops});assert.equal(saved.error,null);
   await nav(page).getByRole('button',{name:'Mis rutas',exact:true}).click();await page.getByRole('button',{name:'Cargar ruta',exact:true}).click();const resume=page.getByRole('combobox',{name:'Retomar desde',exact:true});await resume.waitFor();assert.equal(await resume.inputValue(),'0');assert.equal(await resume.locator('option').count(),49);
   await resume.selectOption('24');const guides=page.getByRole('checkbox',{name:/Añadir puntos guía del recorrido/});assert.equal(await guides.isChecked(),true);
   const first=new URL(await page.locator('.navigation-segments a').first().getAttribute('href'));assert.equal(first.searchParams.get('origin'),`${result.waypoints[24].lat}, ${result.waypoints[24].lng}`);
   await guides.uncheck();
   for(const limit of ['3','9']){
    await page.getByRole('combobox',{name:'Paradas intermedias por enlace',exact:true}).selectOption(limit);assert.equal(await resume.inputValue(),'24');
    const hrefs=await page.locator('.navigation-segments a').evaluateAll(nodes=>nodes.map(n=>n.href));const visited=[];
    for(const [index,href]of hrefs.entries()){const p=new URL(href).searchParams;assert.equal(p.get('avoid'),'tolls,highways');const part=[p.get('origin'),...(p.get('waypoints')?.split('|')||[]),p.get('destination')];if(index)assert.equal(part[0],visited.at(-1));visited.push(...part.slice(index?1:0));}
    assert.deepEqual(visited,result.waypoints.slice(24).map(p=>`${p.lat}, ${p.lng}`));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   }
   await nav(page).getByRole('button',{name:'Mis rutas',exact:true}).click();await nav(page).getByRole('button',{name:'Planificar',exact:true}).click();assert.equal(await resume.inputValue(),'24');
   await page.getByRole('button',{name:'Volver al origen del recorrido',exact:true}).click();assert.equal(await resume.inputValue(),'0');
   const persisted=await client.from('saved_routes').select('route_metadata').eq('id',saved.data).single();assert.equal(persisted.error,null);assert.deepEqual(persisted.data.route_metadata.result,result);
   const deliveries=await client.from('route_stops').select('location').eq('route_id',saved.data).order('sequence');assert.equal(deliveries.error,null);assert.deepEqual(deliveries.data.map(row=>row.location.label),stops.map(p=>p.label));
  }finally{await context.close();}
 }
});

test('real local delivery progress persists across reloads, preserves history and rejects competing sessions',{timeout:120000},async()=>{
 for(const width of [390,1365]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});const page=await context.newPage();
  try{
   const username='progress-owner-'+width;await page.goto(base);await createAccount(page,username);const owner=await session(username),parallel=await session(username),foreign=await createLocalAccount(username+'-other');
   const point={label:'Patio sintético',lat:28.63000123,lng:-106.0600456};const stops=Array.from({length:48},(_,i)=>({...point,label:'Entrega sintética '+(i+1)}));
   const saved=await owner.client.rpc('save_route_with_stops',{p_request_id:crypto.randomUUID(),p_route:{name:'Avance 48 entregas',origin:point,destination:{...point,label:'Destino sintético'},route_metadata:{mode:'delivery'}},p_stops:stops});assert.equal(saved.error,null);
   await nav(page).getByRole('button',{name:'Mis rutas',exact:true}).click();await page.getByRole('button',{name:'Entregas',exact:true}).click();
   const panel=page.getByRole('region',{name:'Avance de entregas',exact:true});await panel.getByRole('checkbox',{name:'Entrega 1 completado',exact:true}).waitFor();assert.equal(await panel.getByRole('checkbox').count(),49);
   assert.equal(await panel.getByRole('button',{name:'Guardar avance',exact:true}).isDisabled(),true);
   for(const title of ['Entrega 1','Entrega 24','Destino'])await panel.getByRole('checkbox',{name:title+' completado',exact:true}).check();
   const before=await owner.client.from('route_delivery_events').select('revision');assert.equal(before.error,null);assert.deepEqual(before.data,[]);
   await panel.getByRole('button',{name:'Guardar avance',exact:true}).click();await panel.getByText(/Avance guardado en tu cuenta/).waitFor();
   let state=await owner.client.rpc('route_delivery_progress',{p_route_id:saved.data});assert.equal(state.error,null);assert.deepEqual(state.data.completedSequences,[1,24,49]);assert.equal(state.data.points.length,50);
   await page.reload();await page.getByRole('button',{name:'Entregas',exact:true}).click();await panel.getByRole('checkbox',{name:'Entrega 1 completado',exact:true}).waitFor();assert.equal(await panel.getByRole('checkbox',{name:'Destino completado',exact:true}).isChecked(),true);
   await panel.getByRole('checkbox',{name:'Entrega 2 completado',exact:true}).check();
   const elsewhere=await parallel.client.rpc('route_delivery_progress',{p_route_id:saved.data,p_completed:[24],p_expected_revision:1,p_expected_snapshot:state.data.snapshot});assert.equal(elsewhere.error,null);
   await panel.getByRole('button',{name:'Guardar avance',exact:true}).click();await panel.getByRole('alert').filter({hasText:'otra sesión'}).waitFor();assert.equal(await panel.getByRole('checkbox',{name:'Entrega 2 completado',exact:true}).isChecked(),true);
   await panel.getByRole('button',{name:'Actualizar avance',exact:true}).click();await panel.getByText(/Revisión 2/).first().waitFor();assert.equal(await panel.getByRole('checkbox',{name:'Entrega 1 completado',exact:true}).isChecked(),false);
   await panel.locator('summary').click();await panel.getByRole('button',{name:'Revisar selección 1',exact:true}).click();assert.equal(await panel.getByRole('checkbox',{name:'Entrega 1 completado',exact:true}).isChecked(),true);
   assert.equal((await owner.client.from('route_delivery_events').select('revision')).data.length,2,'reviewing history does not write');
   await panel.getByRole('button',{name:'Guardar avance',exact:true}).click();await panel.getByText(/Avance guardado en tu cuenta/).waitFor();
   const history=await owner.client.from('route_delivery_events').select('revision,completed_sequences').order('revision');assert.equal(history.error,null);assert.deepEqual(history.data.map(row=>row.completed_sequences),[[1,24,49],[24],[1,24,49]]);
   const stored=await owner.client.from('route_stops').select('location').eq('route_id',saved.data).order('sequence');assert.equal(stored.error,null);assert.deepEqual(stored.data.map(row=>row.location),stops,'progress never edits the original deliveries');
   const hidden=await foreign.client.from('route_delivery_events').select('revision');assert.equal(hidden.error,null);assert.deepEqual(hidden.data,[]);assert.ok((await foreign.client.rpc('route_delivery_progress',{p_route_id:saved.data})).error);
   const changed=await owner.client.from('route_stops').update({location:{...point,label:'Acceso sintético corregido'}}).eq('route_id',saved.data).eq('sequence',1);assert.equal(changed.error,null);
   await panel.getByRole('button',{name:'Actualizar avance',exact:true}).click();await panel.getByText(/Los puntos o su orden cambiaron/).waitFor();assert.equal(await panel.getByRole('checkbox',{name:'Entrega 24 completado',exact:true}).isChecked(),false);
   await panel.getByRole('button',{name:'Guardar avance',exact:true}).click();await panel.getByText(/Avance guardado en tu cuenta/).waitFor();
   await page.getByRole('button',{name:'Eliminar ruta Avance 48 entregas',exact:true}).click();await page.getByText(/Ruta eliminada. Puedes recuperarla/).waitFor();await page.getByRole('button',{name:'Papelera',exact:true}).click();await page.getByRole('button',{name:'Recuperar Avance 48 entregas',exact:true}).click();await page.getByText('Ruta recuperada.',{exact:true}).waitFor();await page.getByRole('button',{name:'Ver rutas activas',exact:true}).click();await page.getByRole('button',{name:'Entregas',exact:true}).click();await panel.getByText(/Revisión 4/).first().waitFor();
   assert.equal((await owner.client.from('route_delivery_events').select('revision')).data.length,4);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const raceRoute=await owner.client.rpc('save_route_with_stops',{p_request_id:crypto.randomUUID(),p_route:{name:'Synthetic race',origin:point,destination:point,route_metadata:{mode:'delivery'}},p_stops:[]});assert.equal(raceRoute.error,null);
   const race=await owner.client.rpc('route_delivery_progress',{p_route_id:raceRoute.data});assert.equal(race.error,null);
   const attempts=await Promise.all([owner.client.rpc('route_delivery_progress',{p_route_id:raceRoute.data,p_completed:[1],p_expected_revision:0,p_expected_snapshot:race.data.snapshot}),parallel.client.rpc('route_delivery_progress',{p_route_id:raceRoute.data,p_completed:[],p_expected_revision:0,p_expected_snapshot:race.data.snapshot})]);
   assert.equal(attempts.filter(x=>!x.error).length,1);assert.equal(attempts.filter(x=>x.error?.code==='40001').length,1);
  }finally{await context.close();}
 }
});

test('real local saved progress is refreshed before explicit Google review and never skips pending occurrences',{timeout:120000},async()=>{
 for(const width of [390,1365]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});await context.route('https://tile.openstreetmap.org/**',r=>r.abort());const page=await context.newPage();
  try{
   const username='review-owner-'+width;await page.goto(base);await createAccount(page,username);const owner=await session(username),parallel=await session(username);
   const points=Array.from({length:50},(_,i)=>({label:'Visita sintética '+i,lat:28.630001+i/100000,lng:-106.06000456}));points[2]={...points[1]};
   const saved=await owner.client.rpc('save_route_with_stops',{p_request_id:crypto.randomUUID(),p_route:{name:'Revisión de 49 entregas',origin:points[0],destination:points[49],route_metadata:{mode:'truck',result:{preferences:{avoidTolls:true,avoidHighways:true}}}},p_stops:points.slice(1,-1)});assert.equal(saved.error,null);
   let state=await owner.client.rpc('route_delivery_progress',{p_route_id:saved.data});assert.equal(state.error,null);
   const update=async completed=>{const r=await parallel.client.rpc('route_delivery_progress',{p_route_id:saved.data,p_completed:completed,p_expected_revision:state.data.revision,p_expected_snapshot:state.data.snapshot});assert.equal(r.error,null);state=r;};
   await update([1,2,24,49]);
   await nav(page).getByRole('button',{name:'Mis rutas',exact:true}).click();await page.getByRole('button',{name:'Entregas',exact:true}).click();const panel=page.getByRole('region',{name:'Avance de entregas',exact:true});await panel.getByText(/Revisión 1/).first().waitFor();
   assert.equal(await panel.locator('.navigation-segments a').count(),0);await update([1,3]);
   await panel.getByRole('button',{name:'Revisar navegación',exact:true}).click();const review=panel.getByRole('region',{name:'Navegación de la ruta guardada',exact:true});await review.getByText('Avance consultado · Revisión 2',{exact:true}).waitFor();
   assert.equal(await panel.getByRole('checkbox',{name:'Entrega 2 completado',exact:true}).isChecked(),false,'review refreshes the persisted selection');
   assert.equal(await review.getByRole('combobox',{name:'Retomar desde',exact:true}).inputValue(),'0');assert.equal(new URL(await review.locator('.navigation-segments a').first().getAttribute('href')).searchParams.get('origin'),`${points[0].lat}, ${points[0].lng}`);
   assert.ok((await review.innerText()).includes('No se transfiere la ruta exacta del camión'));assert.equal(await review.getByRole('checkbox').count(),0,'no computed trace/guide points are claimed');
   await review.getByRole('button',{name:'Retomar después de entrega 1',exact:true}).click();
   for(const limit of ['3','9']){
    await review.getByRole('combobox',{name:'Paradas intermedias por enlace',exact:true}).selectOption(limit);const visited=[];const links=await review.locator('.navigation-segments a').evaluateAll(nodes=>nodes.map(n=>n.href));
    for(const [i,href]of links.entries()){const p=new URL(href).searchParams;assert.equal(p.get('avoid'),'tolls,highways');const part=[p.get('origin'),...(p.get('waypoints')?.split('|')||[]),p.get('destination')];if(i)assert.equal(part[0],visited.at(-1));visited.push(...part.slice(i?1:0));}
    assert.deepEqual(visited,points.slice(1).map(p=>`${p.lat}, ${p.lng}`),'both repeated visits and the later completed point stay in order');
   }
   await review.getByRole('combobox',{name:'Retomar desde',exact:true}).selectOption('24');await review.getByRole('alert').filter({hasText:'puntos pendientes'}).waitFor();
   await panel.getByRole('checkbox',{name:'Entrega 2 completado',exact:true}).check();assert.equal(await review.count(),0);assert.equal(await panel.getByRole('button',{name:'Revisar navegación',exact:true}).isDisabled(),true);
   await panel.getByRole('checkbox',{name:'Entrega 2 completado',exact:true}).uncheck();assert.equal(await review.count(),0,'undoing a checkbox cannot restore an old review');
   const history=await owner.client.from('route_delivery_events').select('revision').eq('route_id',saved.data);assert.equal(history.error,null);assert.equal(history.data.length,2,'navigation review never writes completion');
   await update(Array.from({length:49},(_,i)=>i+1));await panel.getByRole('button',{name:'Revisar navegación',exact:true}).click();await review.getByText(/Todos los puntos figuran completados/).waitFor();assert.equal(await review.getByRole('button',{name:/Retomar después de entrega/}).count(),0);assert.equal(await review.getByRole('combobox',{name:'Retomar desde',exact:true}).inputValue(),'0');
   const changed=await owner.client.from('route_stops').update({location:{...points[2],label:'Acceso corregido'}}).eq('route_id',saved.data).eq('sequence',2);assert.equal(changed.error,null);
   await panel.getByRole('button',{name:'Revisar navegación',exact:true}).click();await panel.getByText(/Los puntos o su orden cambiaron/).waitFor();assert.equal(await review.count(),0);assert.equal(await panel.getByRole('button',{name:'Revisar navegación',exact:true}).isDisabled(),true);
   assert.equal((await owner.client.from('route_delivery_events').select('revision').eq('route_id',saved.data)).data.length,3);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }finally{await context.close();}
 }
});

test('real local saved trace review loads geometry only on demand and rejects an intervening progress change',{timeout:120000},async()=>{
 for(const width of [390,1365]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});await context.route('https://tile.openstreetmap.org/**',r=>r.abort());const page=await context.newPage();
  try{
   const username='trace-owner-'+width;await page.goto(base);await createAccount(page,username);const owner=await session(username),parallel=await session(username);
   const points=Array.from({length:50},(_,i)=>({label:'Acceso sintético '+i,lat:28.63000123+i/100000,lng:-106.0600456}));points[2]={...points[1]};
   let polyline='',lat=0,lng=0;const encode=value=>{let n=value<0?~(value<<1):value<<1,out='';while(n>=32){out+=String.fromCharCode((32|(n&31))+63);n>>=5;}return out+String.fromCharCode(n+63);};
   for(const p of points){const a=Math.round(p.lat*1e5),b=Math.round(p.lng*1e5);polyline+=encode(a-lat)+encode(b-lng);lat=a;lng=b;}
   const result={polyline,waypoints:points.map((p,i)=>({...p,type:i===0?'origin':i===49?'destination':'stop',geometryIndex:i})),distanceMeters:3200,durationSeconds:780,sections:[],preferences:{avoidTolls:true,avoidHighways:false}};
   const saved=await owner.client.rpc('save_route_with_stops',{p_request_id:crypto.randomUUID(),p_route:{name:'Trazado sintético 48 entregas',origin:points[0],destination:points[49],route_metadata:{mode:'truck',result}},p_stops:points.slice(1,-1)});assert.equal(saved.error,null);
   let state=await owner.client.rpc('route_delivery_progress',{p_route_id:saved.data});assert.equal(state.error,null);
   const update=async completed=>{const r=await parallel.client.rpc('route_delivery_progress',{p_route_id:saved.data,p_completed:completed,p_expected_revision:state.data.revision,p_expected_snapshot:state.data.snapshot});assert.equal(r.error,null);state=r;};await update([1,3,49]);
   const geometryRequests=[];page.on('request',request=>{const u=new URL(request.url());if(u.pathname.endsWith('/saved_routes')&&u.searchParams.get('select')?.includes('polyline:'))geometryRequests.push(request);});
   await nav(page).getByRole('button',{name:'Mis rutas',exact:true}).click();await page.getByRole('button',{name:'Entregas',exact:true}).click();const panel=page.getByRole('region',{name:'Avance de entregas',exact:true});await panel.getByText(/Revisión 1/).first().waitFor();
   await panel.getByRole('button',{name:'Revisar navegación',exact:true}).click();const review=panel.getByRole('region',{name:'Navegación de la ruta guardada',exact:true});await review.getByText('Avance consultado · Revisión 1',{exact:true}).waitFor();
   const preview=review.getByRole('region',{name:'Trazado guardado junto al avance',exact:true});assert.equal(geometryRequests.length,0);assert.equal(await preview.locator('.leaflet-container').count(),0);
   const linksBefore=await review.locator('.navigation-segments a').evaluateAll(nodes=>nodes.map(n=>n.href));
   await preview.getByRole('button',{name:'Ver trazado guardado',exact:true}).click();await preview.getByRole('heading',{name:'Trazado guardado completo',exact:true}).waitFor();await preview.locator('.leaflet-container').waitFor();
   assert.equal(geometryRequests.length,1);assert.equal(await preview.getByRole('list',{name:'Puntos del trazado y avance consultado',exact:true}).locator('li').count(),50);
   const entries=await preview.locator('.saved-trace-points li').allTextContents();assert.match(entries[1],/Entrega 1.*Completado manualmente/);assert.match(entries[2],/Entrega 2.*Pendiente/);assert.match(entries[3],/Entrega 3.*Completado manualmente/);assert.match(entries[49],/Destino.*Completado manualmente/);
   await preview.locator('.rp-map-pin-completed').first().waitFor();assert.equal(await preview.locator('.rp-map-pin-completed').count(),3);assert.equal(await preview.locator('.rp-map-pin-pending').count(),46);
   await preview.getByRole('button',{name:'Ubicar primera pendiente',exact:true}).click();await preview.locator('.leaflet-popup-content').getByText('Entrega 2 · Pendiente',{exact:true}).waitFor();assert.equal(await preview.getByRole('button',{name:'Ubicar entrega 2 en el mapa',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await preview.locator('.rp-map-pin-focused').count(),1);
   const access=preview.getByRole('complementary',{name:'Acceso del punto elegido',exact:true});await access.getByText('Revisar acceso · Entrega 2',{exact:true}).waitFor();const accessLinks=await access.getByRole('link').evaluateAll(nodes=>nodes.map(n=>({href:n.href,target:n.target,rel:n.rel})));assert.equal(accessLinks.length,2);assert.equal(new URL(accessLinks[0].href).searchParams.get('query'),`${points[2].lat},${points[2].lng}`);assert.equal(new URL(accessLinks[1].href).searchParams.get('viewpoint'),`${points[2].lat},${points[2].lng}`);assert.ok(accessLinks.every(l=>l.target==='_blank'&&l.rel.includes('noreferrer')));assert.ok((await access.innerText()).includes('puede no haber cobertura'));
   await preview.getByRole('button',{name:'Ubicar entrega 1 en el mapa',exact:true}).click();await preview.locator('.leaflet-popup-content').getByText('Entrega 1 · Completado manualmente',{exact:true}).waitFor();await preview.locator('.leaflet-popup-content').getByText('Entrega 2 · Pendiente',{exact:true}).first().waitFor({state:'detached'});assert.equal(await preview.getByRole('button',{name:'Ubicar entrega 2 en el mapa',exact:true}).getAttribute('aria-pressed'),'false');
   await preview.getByRole('button',{name:'Ubicar entrega 2 en el mapa',exact:true}).click();await preview.locator('.leaflet-popup-content').getByText('Entrega 2 · Pendiente',{exact:true}).waitFor();await preview.locator('.leaflet-popup-content').getByText('Entrega 1 · Completado manualmente',{exact:true}).first().waitFor({state:'detached'});
   const marker=await preview.locator('.leaflet-marker-icon[title="Entrega 2 · Pendiente"]').boundingBox(),map=await preview.locator('.leaflet-container').boundingBox();assert.ok(marker&&map&&marker.x>=map.x&&marker.x<map.x+map.width&&marker.y>=map.y&&marker.y<map.y+map.height,'selected occurrence is inside the map viewport');
   await preview.getByRole('button',{name:'Ver recorrido completo',exact:true}).click();assert.equal(await preview.locator('.rp-map-pin-focused').count(),0);await preview.locator('.leaflet-popup-content').first().waitFor({state:'detached'});assert.equal(await preview.locator('.leaflet-popup-content').count(),0);assert.equal(await preview.locator('.leaflet-marker-icon').count(),50);assert.equal(await access.count(),0,'full route view closes the occurrence access panel');
   assert.deepEqual(await review.locator('.navigation-segments a').evaluateAll(nodes=>nodes.map(n=>n.href)),linksBefore,'preview cannot replace navigation points, guides or order');assert.equal(await review.getByRole('combobox',{name:'Retomar desde',exact:true}).inputValue(),'0');
   assert.ok((await preview.innerText()).includes('No es un cálculo actualizado desde tu posición'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await preview.getByRole('button',{name:'Ocultar trazado guardado',exact:true}).click();assert.equal(await preview.locator('.leaflet-container').count(),0);
   await update([1,2,3,49]);await preview.getByRole('button',{name:'Ver trazado guardado',exact:true}).click();await panel.getByRole('status').filter({hasText:'El recorrido o su avance cambió'}).waitFor();assert.equal(await review.count(),0,'a detected change removes both the map and the old navigation links');assert.equal(await panel.locator('.navigation-segments a').count(),0);
   await panel.getByRole('button',{name:'Revisar navegación',exact:true}).click();await review.getByText('Avance consultado · Revisión 2',{exact:true}).waitFor();await preview.getByRole('button',{name:'Ver trazado guardado',exact:true}).click();await preview.getByRole('heading',{name:'Trazado guardado completo',exact:true}).waitFor();
   assert.match((await preview.locator('.saved-trace-points li').allTextContents())[2],/Completado manualmente/);
   await panel.getByRole('checkbox',{name:'Entrega 4 completado',exact:true}).check();assert.equal(await review.count(),0,'editing completion removes the old map and its reviewed snapshot');
   assert.equal((await owner.client.from('route_delivery_events').select('revision').eq('route_id',saved.data)).data.length,2,'preview is read-only and creates no progress events');
   assert.deepEqual((await owner.client.from('saved_routes').select('route_metadata').eq('id',saved.data).single()).data.route_metadata.result,result,'preview never changes the stored calculation');
  }finally{await context.close();}
 }
});

test('real local authenticated proxy rejects an incomplete provider route and preserves confirmed inputs',{timeout:120000},async()=>{
 for(const width of [390,1365]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});await context.route('https://tile.openstreetmap.org/**',r=>r.abort());const page=await context.newPage();
  try{
   const username='invalid-provider-'+width;await page.goto(base);await createAccount(page,username);const owner=await session(username);
   await page.getByRole('button',{name:'Camión',exact:true}).click();await page.getByRole('spinbutton',{name:'Altura (m)',exact:true}).fill('3.8');await page.getByRole('checkbox',{name:'Evitar casetas de peaje',exact:true}).check();
   await point(page,'Origen','28.632995, -106.0691');await point(page,'Destino','28.660099, -106.08');await page.getByRole('button',{name:'＋ Agregar parada',exact:true}).click();await point(page,'PARADA 1','28.64, -106.07');
   const labels=await Promise.all(['Origen','PARADA 1','Destino'].map(name=>page.getByRole('combobox',{name,exact:true}).inputValue()));const before=readFileSync(capture,'utf8').trim().split('\n').length;
   const pending=page.waitForResponse(r=>r.url().endsWith('/v1/routes/plan'));await page.getByRole('button',{name:'Calcular ruta',exact:true}).click();const response=await pending,payload=await response.json();
   assert.equal(response.status(),502);assert.equal(payload.code,'ORS_INVALID_ROUTE');assert.equal(payload.reason,'INVALID_SUMMARY');assert.equal(payload.route,undefined);
   await page.getByRole('alert').filter({hasText:'recorrido incompleto o inconsistente'}).waitFor();assert.equal(await page.getByRole('button',{name:'Guardar esta ruta',exact:true}).count(),0);assert.equal(await page.getByRole('heading',{name:'Detalle del recorrido',exact:true}).count(),0);
   assert.deepEqual(await Promise.all(['Origen','PARADA 1','Destino'].map(name=>page.getByRole('combobox',{name,exact:true}).inputValue())),labels);assert.equal(await page.getByRole('spinbutton',{name:'Altura (m)',exact:true}).inputValue(),'3.8');assert.equal(await page.getByRole('checkbox',{name:'Evitar casetas de peaje',exact:true}).isChecked(),true);
   const requests=readFileSync(capture,'utf8').trim().split('\n').map(JSON.parse);assert.equal(requests.length,before+1,'incomplete response must never trigger a second request with weaker constraints');assert.equal(requests.at(-1).body.coordinates.length,3);assert.deepEqual(requests.at(-1).body.options.avoid_features,['tollways']);assert.equal(requests.at(-1).body.options.profile_params.restrictions.height,3.8);
   assert.deepEqual(await rows(owner.client,'saved_routes'),[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }finally{await context.close();}
 }
});

test('real local restore rejects a calculation with a changed delivery access and preserves all current occurrences',{timeout:120000},async()=>{
 for(const width of [390,1365]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});await context.route('https://tile.openstreetmap.org/**',r=>r.abort());const page=await context.newPage();
  try{
   const username='restore-access-'+width;await page.goto(base);await createAccount(page,username);const owner=await session(username);
   const points=Array.from({length:50},(_,i)=>({label:'Entrega sintética '+i,lat:28.63000123+i/100000,lng:-106.0600456}));points[2]={...points[1]};
   let polyline='',lat=0,lng=0;const encode=value=>{let n=value<0?~(value<<1):value<<1,out='';while(n>=32){out+=String.fromCharCode((32|(n&31))+63);n>>=5;}return out+String.fromCharCode(n+63);};for(const p of points){const a=Math.round(p.lat*1e5),b=Math.round(p.lng*1e5);polyline+=encode(a-lat)+encode(b-lng);lat=a;lng=b;}
   const result={polyline,waypoints:points.map((p,i)=>({...p,type:i===0?'origin':i===49?'destination':'stop',geometryIndex:i})),distanceMeters:3200,durationSeconds:780,sections:[],preferences:{avoidTolls:true,avoidHighways:true}};
   const saved=await owner.client.rpc('save_route_with_stops',{p_request_id:crypto.randomUUID(),p_route:{name:'Acceso corregido 48 entregas',origin:points[0],destination:points[49],route_metadata:{mode:'truck',result}},p_stops:points.slice(1,-1)});assert.equal(saved.error,null);
   const initial=await owner.client.rpc('route_delivery_progress',{p_route_id:saved.data});assert.equal(initial.error,null);const marked=await owner.client.rpc('route_delivery_progress',{p_route_id:saved.data,p_completed:[1,49],p_expected_revision:initial.data.revision,p_expected_snapshot:initial.data.snapshot});assert.equal(marked.error,null);
   const corrected={...points[2],label:'Entrada de descarga corregida',lat:28.641234567};assert.equal((await owner.client.from('route_stops').update({location:corrected}).eq('route_id',saved.data).eq('sequence',2)).error,null);
   const before=(await owner.client.rpc('route_delivery_progress',{p_route_id:saved.data})).data;const calculationCalls=[];page.on('request',r=>{if(r.url().endsWith('/v1/routes/plan'))calculationCalls.push(r);});
   await nav(page).getByRole('button',{name:'Mis rutas',exact:true}).click();await page.getByRole('button',{name:'Cargar ruta',exact:true}).click();await page.getByRole('status').filter({hasText:'ya no coinciden con el cálculo anterior'}).waitFor();
   assert.equal(await page.locator('.metrics').count(),0);assert.equal(await page.getByRole('button',{name:'Guardar esta ruta',exact:true}).count(),0);assert.equal(await page.locator('.navigation-segments a').count(),0);assert.equal(calculationCalls.length,0,'restoring cannot silently consume routing');
   assert.equal(await page.locator('.stop-field').count(),48);assert.equal(await page.getByRole('combobox',{name:'PARADA 1',exact:true}).inputValue(),points[1].label);assert.equal(await page.getByRole('combobox',{name:'PARADA 2',exact:true}).inputValue(),corrected.label);assert.equal(await page.getByRole('combobox',{name:'PARADA 48',exact:true}).inputValue(),points[48].label);
   assert.equal(await page.getByRole('checkbox',{name:'Evitar casetas de peaje',exact:true}).isChecked(),true);assert.equal(await page.getByRole('checkbox',{name:'Evitar autopistas',exact:true}).isChecked(),true);
   await page.getByRole('button',{name:'Calcular ruta',exact:true}).click();await page.locator('.metrics').waitFor();assert.equal(calculationCalls.length,1);const body=calculationCalls[0].postDataJSON();assert.equal(body.stops.length,48);assert.deepEqual(body.stops[1],corrected);assert.equal(body.stops[0].lat,points[1].lat);assert.deepEqual(body.preferences,{avoidTolls:true,avoidHighways:true});
   assert.equal(await page.getByRole('status').filter({hasText:'ya no coinciden con el cálculo anterior'}).count(),0);assert.ok(await page.getByRole('button',{name:'Guardar esta ruta',exact:true}).isVisible());assert.ok(await page.locator('.navigation-segments a').count()>0);
   assert.deepEqual((await owner.client.from('saved_routes').select('route_metadata').eq('id',saved.data).single()).data.route_metadata.result,result);assert.deepEqual((await owner.client.rpc('route_delivery_progress',{p_route_id:saved.data})).data,before,'the old route and progress history remain untouched');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }finally{await context.close();}
 }
});

test('current real local API gates a natural city mismatch before precise confirmation and authenticated truck planning',{timeout:120000},async()=>{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});
  await context.route('https://tile.openstreetmap.org/**',r=>r.abort());
  const page=await context.newPage();
  try{
   await page.goto(base);await createAccount(page,'current-locality-'+width);
   await page.getByRole('button',{name:'Camión',exact:true}).click();
   const origin={lat:28.632995123,lng:-106.069100456},destination={lat:28.635300123,lng:-106.088900456};
   await point(page,'Origen',`${origin.lat},${origin.lng}`);
   const input=page.getByRole('combobox',{name:'Destino',exact:true}),field=page.locator('.location-field').filter({has:input});
   const query='Bodega Aurrera Express en Chihuahua';
   const search=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/v1/locations/suggest')&&new URL(r.url()).searchParams.get('q')===query);
   await input.fill(query);const response=await search,payload=await response.json();
   assert.equal(response.status(),200);assert.equal(payload.warning,'LOCALITY_NOT_VERIFIED');assert.equal(payload.suggestions[0].locality,'Ciudad de México');
   await field.getByText(/No pudimos corroborar la localidad escrita/).waitFor();assert.equal(await field.getByRole('option').count(),0);assert.equal(await page.locator('.rp-map-pin-search').count(),0);
   await input.press('Enter');assert.equal(await field.locator('.location-confirm-card').count(),0);assert.equal(await field.locator('.location-confirmed').count(),0);assert.ok(await page.getByRole('button',{name:'Calcular ruta',exact:true}).isDisabled());
   const recovery=field.getByRole('region',{name:'Otra forma de ubicar destino',exact:true});assert.equal(new URL(await recovery.getByRole('link').getAttribute('href')).searchParams.get('query'),query);
   await field.getByRole('button',{name:'Ver coincidencias sin localidad corroborada (1)',exact:true}).click();await field.getByRole('option').waitFor();await page.locator('.rp-map-pin-search').waitFor();
   await field.getByRole('button',{name:'Ocultar coincidencias sin localidad corroborada',exact:true}).click();assert.equal(await field.getByRole('option').count(),0);assert.equal(await page.locator('.rp-map-pin-search').count(),0);
   await point(page,'Destino',`${destination.lat},${destination.lng}`);
   const plan=page.waitForResponse(r=>r.url().endsWith('/v1/routes/plan'));await page.getByRole('button',{name:'Calcular ruta',exact:true}).click();const planned=await plan,body=await planned.json();assert.equal(planned.status(),200);
   assert.deepEqual(body.route.waypoints.map(p=>({lat:p.lat,lng:p.lng})),[origin,destination]);assert.equal(body.route.regulatoryCoverage.status,'not_verified');assert.equal(body.route.regulatoryCoverage.municipalGeometryEnforced,false);await page.locator('.metrics').waitFor();
   const link=new URL(await page.getByRole('link',{name:/Abrir puntos en Google Maps/}).getAttribute('href'));assert.equal(link.searchParams.get('destination'),`${destination.lat}, ${destination.lng}`);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }finally{await context.close();}
 }
});
