import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import {registerHooks} from 'node:module';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://route-planner.example.test' });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }, Element: { value: dom.window.Element, configurable: true }, HTMLElement: { value: dom.window.HTMLElement, configurable: true }, React: { value: React, configurable: true },
});
dom.window.SVGSVGElement.prototype.createSVGRect = () => ({});
const cssHook=registerHooks({load(url,context,next){return url.endsWith('.css')?{format:'module',source:'export default {};',shortCircuit:true}:next(url,context);}});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const savedBroadcastChannel = globalThis.BroadcastChannel;
globalThis.BroadcastChannel = undefined;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-public-key';
const { createRoot } = await import('react-dom/client');
const { supabase } = await import('../lib/supabase.ts');
supabase.auth.getUser = async () => ({ data: { user: null }, error: null });
supabase.auth.getSession = async () => ({ data: { session: { access_token: 'test-session' } }, error: null });
supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } });
const { default: Home } = await import('../app/page.tsx');
const savedFetch = globalThis.fetch;
let root, container;
afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); globalThis.fetch = savedFetch; });
after(async () => { await supabase.auth.stopAutoRefresh(); globalThis.BroadcastChannel = savedBroadcastChannel; cssHook.deregister(); dom.window.close(); });

function button(text) { return [...container.querySelectorAll('button')].find(node => node.textContent.includes(text)); }
async function fill(input, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

test('manual order disables optimization, reaches the API in order, and stale calculations are discarded', async () => {
  let complete, plannedBody, plannedSignal;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/v1/routes/plan')) {
      plannedBody = JSON.parse(options.body); plannedSignal = options.signal;
      // Deliberately ignore abort at the mock provider to exercise the UI's
      // late-response guard as well as the network cancellation signal.
      return new Promise(resolve => { complete = resolve; });
    }
    return Response.json({ ok: true, suggestions: [] });
  };
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(Home)));
  await act(async () => button('Agregar parada').click());
  await act(async () => button('Agregar parada').click());
  const inputs = [...container.querySelectorAll('.route-form .field input')];
  for (const [index, value] of ['Origen de prueba', 'Entrega uno', 'Entrega dos', 'Destino de prueba'].entries()) await fill(inputs[index], value);
  const optimize = container.querySelector('.optimize-toggle input');
  await act(async () => optimize.click());
  assert.equal(optimize.checked, true);
  await act(async () => container.querySelector('[aria-label="Bajar parada 1"]').click());
  assert.equal(optimize.checked, false);
  await act(async () => button('Calcular ruta').click());
  assert.deepEqual(plannedBody.stops, ['Entrega dos', 'Entrega uno']);
  assert.equal(plannedBody.optimize, false);
  const destination = [...container.querySelectorAll('.route-form .field input')].at(-1);
  await fill(destination, 'Destino cambiado');
  assert.equal(plannedSignal.aborted, true);
  await act(async () => complete(Response.json({ ok: true, route: { distanceMeters: 12345, durationSeconds: 300, sections: [], waypoints: [] } })));
  assert.equal(container.querySelector('.metrics'), null);
  assert.equal(container.querySelector('.error-box'), null);
  assert.equal(destination.value, 'Destino cambiado');
});
