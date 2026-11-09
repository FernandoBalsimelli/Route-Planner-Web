import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.RP_BASE_URL || 'http://127.0.0.1:4455';
let server, browser;
before(async () => {
  if (!process.env.RP_BASE_URL) {
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '4455', '-H', '127.0.0.1'], { stdio: 'ignore' });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'production server must start');
  }
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); server?.kill('SIGTERM'); });

async function setup(mockPosition, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 768, hasTouch: viewport.width < 768 });
  // Third-party tiles/fonts are verified in production separately. Mobile
  // interaction tests must not depend on those services or consume their quota.
  await context.route('https://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=', 'base64') }));
  await context.route('https://fonts.googleapis.com/**', route => route.abort());
  await context.route('https://fonts.gstatic.com/**', route => route.abort());
  await context.addInitScript(mockPosition);
  const page = await context.newPage();
  return { context, page };
}
const success = () => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
  getCurrentPosition(ok) { ok({ coords: { latitude: 28.662926123, longitude: -106.099908456, accuracy: 16.4 } }); },
} });

test('mobile GPS button resolves an address, retains coordinates and shows accuracy', async () => {
  const { context, page } = await setup(success);
  try {
    let reverseCalls = 0;
    await page.route('**/api/route-planner/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/reverse')) {
        reverseCalls++;
        assert.equal(Number(url.searchParams.get('lat')), 28.662926123);
        assert.equal(Number(url.searchParams.get('lng')), -106.099908456);
        await route.fulfill({ json: { ok: true, location: { label: 'Dirección de prueba en Chihuahua', plusCode: '75WMMW72+52' } } });
      } else await route.fulfill({ json: { ok: true, suggestions: [] } });
    });
    await page.goto(base);
    assert.equal(reverseCalls, 0, 'does not ask for location on page load');
    const button = page.getByRole('button', { name: 'Usar mi ubicación actual' });
    assert.equal(await button.count(), 1);
    await button.click();
    await page.getByText('Ubicación actual establecida como origen.').waitFor();
    assert.equal(await page.getByRole('combobox', { name: 'Origen', exact: true }).inputValue(), 'Dirección de prueba en Chihuahua');
    assert.match(await page.locator('.location-accuracy').innerText(), /±17 m/);
    assert.equal(await page.locator('.location-confirmed').count(), 1);
    assert.equal(reverseCalls, 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile layout has no horizontal overflow');
  } finally { await context.close(); }
});

test('mobile map confirms the chosen nearby branch into the correct field', async () => {
  const { context, page } = await setup(() => {});
  try {
    await page.route('**/api/route-planner/**', route => {
      const query = new URL(route.request().url()).searchParams.get('q');
      return route.fulfill({ json: { ok: true, suggestions: query === 'Monterrey'
        ? [{ label: 'Monterrey, México', lat: 25.685163, lng: -100.315238 }]
        : [{ label: 'Sucursal Express uno', lat: 25.721274, lng: -100.325989 }, { label: 'Sucursal Express dos', lat: 25.703465, lng: -100.253977, plusCode: '75QXPP3W+9C' }] } });
    });
    await page.goto(base);
    await page.getByRole('combobox', { name: 'Origen', exact: true }).fill('Monterrey');
    await page.getByRole('button', { name: 'S1', exact: true }).click();
    await page.getByRole('button', { name: 'Usar como Origen', exact: true }).click();
    await page.getByRole('combobox', { name: 'Destino', exact: true }).fill('Bodega Aurrera Express');
    await page.getByRole('button', { name: 'S2', exact: true }).click();
    await page.getByRole('button', { name: 'Usar como Destino', exact: true }).click();
    assert.equal(await page.getByRole('combobox', { name: 'Destino', exact: true }).inputValue(), 'Sucursal Express dos');
    const link = new URL(await page.getByRole('link', { name: /Abrir puntos en Google Maps/ }).getAttribute('href'));
    assert.equal(link.searchParams.get('destination'), '25.703465, -100.253977');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  } finally { await context.close(); }
});

test('permission denial keeps the typed origin and allows a retry', async () => {
  const { context, page } = await setup(() => Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition(ok, fail) { fail({ code: 1 }); } } }));
  try {
    await page.route('**/api/route-planner/**', route => route.fulfill({ json: { ok: true, suggestions: [] } }));
    await page.goto(base);
    await page.getByRole('combobox', { name: 'Origen', exact: true }).fill('Mi origen escrito');
    await page.getByRole('button', { name: 'Usar mi ubicación actual' }).click();
    await page.getByText(/No se permitió el acceso/).waitFor();
    assert.equal(await page.getByRole('combobox', { name: 'Origen', exact: true }).inputValue(), 'Mi origen escrito');
    assert.ok(await page.getByRole('button', { name: 'Usar mi ubicación actual' }).isEnabled());
  } finally { await context.close(); }
});

test('address service failure still confirms the device coordinates', async () => {
  const { context, page } = await setup(success);
  try {
    await page.route('**/api/route-planner/**', route => route.fulfill({ status: 503, json: { ok: false } }));
    await page.goto(base);
    await page.getByRole('button', { name: 'Usar mi ubicación actual' }).click();
    await page.getByText(/Origen establecido con coordenadas/).waitFor();
    assert.match(await page.getByRole('combobox', { name: 'Origen', exact: true }).inputValue(), /Mi ubicación/);
    assert.equal(await page.locator('.location-confirmed').count(), 1);
  } finally { await context.close(); }
});

test('typing after a GPS request cancels its late result', async () => {
  const { context, page } = await setup(() => Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition(ok) { setTimeout(() => ok({ coords: { latitude: 28.66, longitude: -106.09, accuracy: 10 } }), 700); } } }));
  try {
    await page.route('**/api/route-planner/**', route => route.fulfill({ json: { ok: true, suggestions: [] } }));
    await page.goto(base);
    await page.getByRole('button', { name: 'Usar mi ubicación actual' }).click();
    await page.getByRole('combobox', { name: 'Origen', exact: true }).fill('Conservar este origen');
    await page.waitForTimeout(900);
    assert.equal(await page.getByRole('combobox', { name: 'Origen', exact: true }).inputValue(), 'Conservar este origen');
    assert.equal(await page.locator('.location-confirmed').count(), 0);
  } finally { await context.close(); }
});

test('mobile workspaces retain the draft, explain truck coverage, and remember the theme', async () => {
  const { context, page } = await setup(() => {});
  try {
    await page.route('**/api/route-planner/**', route => route.fulfill({ json: { ok: true, suggestions: [] } }));
    await page.goto(base);
    await page.getByRole('combobox', { name: 'Origen', exact: true }).fill('Origen que quiero conservar');
    const nav = page.getByRole('navigation', { name: 'Secciones de Route Planner' });
    await nav.getByRole('button', { name: 'Vehículos', exact: true }).click();
    await page.getByRole('heading', { name: 'Mi perfil y vehículos' }).waitFor();
    assert.equal(await page.getByRole('combobox', { name: 'Origen', exact: true }).count(), 0, 'planner is hidden from accessibility tree');
    await nav.getByRole('button', { name: 'Mis rutas', exact: true }).click();
    await page.getByRole('heading', { name: 'Mis rutas guardadas' }).waitFor();
    await nav.getByRole('button', { name: 'Planificar', exact: true }).click();
    assert.equal(await page.getByRole('combobox', { name: 'Origen', exact: true }).inputValue(), 'Origen que quiero conservar');
    await page.getByRole('button', { name: 'Camión', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'Altura (m)', exact: true }).fill('4.1');
    await page.getByRole('button', { name: 'Qué restricciones considera esta ruta' }).click();
    await page.getByRole('heading', { name: 'Cómo planeamos para tu camión' }).waitFor();
    await page.getByText('NOM-012-SCT-2-2017', { exact: true }).waitFor();
    assert.ok(await page.getByRole('link', { name: /DOF: texto y tablas/ }).getAttribute('href'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload();
    await page.getByRole('button', { name: 'Cambiar a modo claro' }).waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await nav.getByRole('button', { name: 'Planificar', exact: true }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  } finally { await context.close(); }
});

test('desktop gives the map the main area and preserves its size after changing sections', async () => {
  const { context, page } = await setup(() => {}, { width: 1440, height: 1000 });
  try {
    await page.goto(base);
    await page.locator('.leaflet-container').waitFor();
    const form = await page.locator('.route-form').boundingBox();
    const map = await page.locator('.route-map').boundingBox();
    assert.ok(map.width > form.width && map.x > form.x, 'desktop map is larger than the planning panel');
    const nav = page.getByRole('navigation', { name: 'Secciones de Route Planner' });
    await nav.getByRole('button', { name: 'Vehículos', exact: true }).click();
    await nav.getByRole('button', { name: 'Planificar', exact: true }).click();
    assert.ok((await page.locator('.route-map').boundingBox()).width > 600);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  } finally { await context.close(); }
});
