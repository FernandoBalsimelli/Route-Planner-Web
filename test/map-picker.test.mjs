import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { registerHooks } from 'node:module';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://route-planner.example.test' });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }, HTMLElement: { value: dom.window.HTMLElement, configurable: true },
});
dom.window.SVGSVGElement.prototype.createSVGRect = () => ({});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const cssHook = registerHooks({ load(url, context, next) {
  return url.endsWith('.css') ? { format: 'module', source: 'export default {};', shortCircuit: true } : next(url, context);
} });
const { default: MapLocationPicker } = await import('../components/MapLocationPicker.tsx');
const { resolvePointLabel } = await import('../lib/locations.ts');
const originalFetch = globalThis.fetch;
let root, container;
afterEach(async () => { if (root) { await act(async () => root.unmount()); root = null; container.remove(); } globalThis.fetch = originalFetch; });
after(() => { cssHook.deregister(); dom.window.close(); });

test('reverse labels never replace the exact point chosen on the map', async () => {
  globalThis.fetch = async () => Response.json({ ok: true, location: { label: 'Acceso de prueba', lat: 10, lng: 10, plusCode: '75WMMW72+52' } });
  const point = { lat: 28.662926123, lng: -106.099908456 };
  const resolved = await resolvePointLabel(point, '/api/route-planner', new AbortController().signal);
  assert.equal(resolved.addressFound, true);
  assert.equal(resolved.location.lat, point.lat);
  assert.equal(resolved.location.lng, point.lng);
});

test('map coordinates remain confirmable when the provider is unavailable', async () => {
  globalThis.fetch = async () => Response.json({ ok: false }, { status: 503 });
  const resolved = await resolvePointLabel({ lat: 28.66, lng: -106.09 }, '/api/route-planner', new AbortController().signal);
  assert.equal(resolved.addressFound, false);
  assert.equal(resolved.location.label, '28.660000, -106.090000');
});

test('map requires an explicit selection and confirmation, then returns the chosen coordinates', async () => {
  let confirmed = null;
  globalThis.fetch = async () => Response.json({ ok: true, location: { label: 'Acceso de prueba', lat: 0, lng: 0 } });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(MapLocationPicker, {
    title: 'Origen', initialPoint: { lat: 28.66, lng: -106.09 }, apiUrl: '/api/route-planner',
    onConfirm: point => { confirmed = point; }, onClose() {},
  })));
  const buttons = () => [...container.querySelectorAll('button')];
  const confirm = () => buttons().find(b => b.textContent === 'Confirmar punto del mapa');
  assert.equal(confirm().disabled, true);
  assert.equal(confirmed, null);
  await act(async () => buttons().find(b => b.textContent === 'Elegir el centro del mapa').click());
  await act(async () => new Promise(resolve => setTimeout(resolve, 350)));
  assert.equal(confirm().disabled, false);
  assert.equal(confirmed, null);
  await act(async () => confirm().click());
  assert.equal(confirmed.source, 'map');
  assert.equal(confirmed.label, 'Acceso de prueba');
  assert.ok(Math.abs(confirmed.lat - 28.66) < 0.000001);
  assert.ok(Math.abs(confirmed.lng + 106.09) < 0.000001);
});
