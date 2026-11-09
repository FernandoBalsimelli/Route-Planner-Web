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
  await page.locator('.account-submit').click();
  await page.getByText('Cuenta creada. Ya puedes guardar tus rutas.', { exact: true }).waitFor();
  await page.locator('.account-button').click();
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
async function rows(client, table) {
  const result = await client.from(table).select('*');
  assert.equal(result.error, null, `REST access to ${table} failed`);
  return result.data;
}

test('real local Auth, browser, proxy, API and RLS complete the vehicle and route lifecycle', { timeout: 180000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.route('https://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=', 'base64') }));
  const page = await context.newPage();
  try {
    await page.goto(base);
    await createAccount(page, 'e2e-owner-one');
    const first = await session('e2e-owner-one');
    await nav(page).getByRole('button', { name: 'Vehículos', exact: true }).click();
    await page.getByRole('button', { name: 'Agregar vehículo' }).click();
    await page.getByLabel('Nombre o número de unidad', { exact: true }).fill('Unidad E2E 12');
    await page.getByLabel('Tipo de vehículo', { exact: true }).selectOption('truck');
    for (const [label,value] of [['Altura total (m)','4.1'],['Ancho (m)','2.5'],['Largo (m)','18'],['Peso bruto cargado (t)','38'],['Peso máximo por eje (t)','9']]) await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByText('Flota (opcional)', { exact: true }).click();
    await page.getByLabel('Nueva flota', { exact: true }).fill('Flota E2E');
    await page.getByRole('button', { name: 'Crear flota', exact: true }).click();
    await page.getByRole('option', { name: 'Flota E2E', exact: true }).waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Guardar y usar vehículo', exact: true }).click();
    await page.getByRole('button', { name: 'Usar en ruta', exact: true }).click();
    assert.equal(await page.getByRole('spinbutton', { name: 'Altura (m)', exact: true }).inputValue(), '4.1');
    assert.ok((await rows(first.client, 'vehicles'))[0].fleet_id, 'the selected fleet is persisted');
    await point(page, 'Origen', '28.632995, -106.0691');
    await point(page, 'Destino', '28.63958, -106.08325');
    await page.getByRole('button', { name: 'Agregar parada' }).click();
    await point(page, 'PARADA 1', '28.64, -106.07');
    await page.getByRole('button', { name: 'Agregar parada' }).click();
    await point(page, 'PARADA 2', '28.65, -106.08');
    await page.getByRole('button', { name: 'Bajar parada 1', exact: true }).click();
    const planResponse = page.waitForResponse(response => response.url().endsWith('/v1/routes/plan'));
    await page.getByRole('button', { name: 'Calcular ruta', exact: true }).click();
    const response = await planResponse;
    assert.equal(response.status(), 200, 'real bearer session must pass proxy and API Auth validation');
    const planned = (await response.json()).route;
    assert.equal(planned.waypoints.length, 4);
    assert.equal(planned.waypoints[1].lat, 28.65);
    await page.getByText('3.4 km', { exact: true }).waitFor();
    const requests = readFileSync(capture, 'utf8').trim().split('\n').map(JSON.parse);
    assert.match(requests[0].path, /driving-hgv/);
    assert.deepEqual(requests[0].body.options.profile_params.restrictions, { height: 4.1, width: 2.5, length: 18, weight: 38, axleload: 9 });
    await page.getByLabel('Nombre del recorrido', { exact: true }).fill('Entregas E2E Express');
    await page.getByRole('button', { name: 'Guardar esta ruta', exact: true }).click();
    await page.getByText('Ruta guardada en tu cuenta.', { exact: true }).waitFor();
    const saved = (await rows(first.client, 'saved_routes'))[0];
    assert.equal(saved.owner_id, first.uid);
    assert.equal(saved.vehicle_id, (await rows(first.client, 'vehicles'))[0].id);
    assert.equal(saved.route_metadata.mode, 'truck');
    assert.equal((await rows(first.client, 'route_stops')).length, 2);
    const destination = page.locator('.location-field').filter({ has: page.getByRole('combobox', { name: 'Destino', exact: true }) });
    await destination.getByRole('button', { name: 'Guardar sucursal' }).click();
    await page.getByLabel('Nombre del favorito para Destino', { exact: true }).fill('Express E2E sucursal 1234');
    await destination.getByRole('button', { name: 'Guardar favorito', exact: true }).click();
    await page.getByText('Sucursal guardada en tus favoritos.', { exact: true }).waitFor();
    assert.equal((await rows(first.client, 'favorite_locations'))[0].name, 'Express E2E sucursal 1234');
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
    await page.locator('.account-button').click();
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await page.getByText('Sesión cerrada.', { exact: true }).waitFor();
    await page.locator('.account-button').click();
    await createAccount(page, 'e2e-owner-two');
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
  } finally { await context.close(); }
});
