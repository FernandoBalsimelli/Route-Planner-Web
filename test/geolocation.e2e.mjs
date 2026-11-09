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

async function setup(mockPosition) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
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
