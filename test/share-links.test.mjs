import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<html><body></body></html>', { url: 'https://routes.example.test' });
Object.defineProperties(globalThis, { window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true }, navigator: { value: dom.window.navigator, configurable: true } });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const oldChannel = globalThis.BroadcastChannel; globalThis.BroadcastChannel = undefined;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth.example.test'; process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-public-key';
const { createRoot } = await import('react-dom/client');
const { supabase } = await import('../lib/supabase.ts');
const { default: RouteShareLinks } = await import('../components/RouteShareLinks.tsx');
const from = supabase.from, rpc = supabase.rpc, timeout = globalThis.setTimeout;
let root, container, requests, listResult, rpcResult;
const token = 'ab'.repeat(32), expiry = '2099-11-18T10:00:00Z';
async function render() {
  requests = []; listResult = Promise.resolve({ data: [], error: null }); rpcResult = () => Promise.resolve({ data: { id: 'share-one', token, expiresAt: expiry }, error: null });
  supabase.from = table => {
    const r = { table, filters: [], orders: [] }; const q = { select(columns) { r.columns = columns; return q; }, eq(k, v) { r.filters.push([k, v]); return q; }, order(k, options) { r.orders.push([k, options]); return q; }, limit(n) { r.limit = n; return q; }, abortSignal(signal) { r.signal = signal; return q; }, then(resolve, reject) { requests.push(r); return listResult.then(resolve, reject); } }; return q;
  };
  supabase.rpc = (name, args) => { const r = { name, args }; return { abortSignal(signal) { r.signal = signal; return this; }, then(resolve, reject) { requests.push(r); return rpcResult(r).then(resolve, reject); } }; };
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(RouteShareLinks, { routeId: 'route-one', ownerId: 'alice', onClose() {} })));
}
const button = name => [...container.querySelectorAll('button')].find(b => b.textContent === name);
afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); supabase.from = from; supabase.rpc = rpc; globalThis.setTimeout = timeout; });
after(async () => { await supabase.auth.stopAutoRefresh(); globalThis.BroadcastChannel = oldChannel; dom.window.close(); });
test('sharing requires explicit consent, never generates on open, and lists only safe owner metadata', async () => {
  await render(); assert.equal(requests.length, 1); assert.equal(button('Crear enlace').disabled, true);
  assert.equal(requests[0].columns.includes('snapshot'), false); assert.equal(requests[0].columns.includes('token_hash'), false);
  assert.deepEqual(requests[0].filters, [['owner_id', 'alice'], ['route_id', 'route-one']]);
  assert.deepEqual(requests[0].orders[0], ['revoked_at', { ascending: true, nullsFirst: true }]);
  await act(async () => container.querySelector('input[type=checkbox]').click()); await act(async () => button('Crear enlace').click());
  assert.equal(requests[1].name, 'create_route_share_link'); assert.deepEqual(requests[1].args, { p_route_id: 'route-one', p_expires_hours: 24 });
  assert.equal(container.querySelector('input[readonly]').value, 'https://routes.example.test/#compartir=' + token);
  assert.equal(window.localStorage.length, 0); assert.equal(button('Crear enlace').disabled, true);
  rpcResult = () => Promise.resolve({ data: true, error: null }); await act(async () => button('Revocar enlace').click());
  assert.equal(requests.at(-1).name, 'revoke_route_share_link'); assert.equal(container.querySelector('input[readonly]'), null); assert.match(container.textContent, /Enlace revocado/);
});
test('leaving a sharing manager cancels and ignores late creation results', async () => {
  await render(); let release; rpcResult = () => new Promise(resolve => { release = resolve; });
  await act(async () => container.querySelector('input[type=checkbox]').click()); await act(async () => button('Crear enlace').click());
  const request = requests.at(-1); await act(async () => root.unmount()); root = null;
  assert.equal(request.signal.aborted, true); await act(async () => release({ data: { id: 'old', token, expiresAt: expiry }, error: null }));
  assert.equal(container.textContent, ''); assert.equal(window.localStorage.length, 0);
});
test('stalled share requests expose a retry and ignore late successes after the deadline', async () => {
  await render(); let release; rpcResult = () => new Promise(resolve => { release = resolve; });
  globalThis.setTimeout = (cb, delay, ...args) => timeout(cb, delay === 30000 ? 15 : delay, ...args);
  await act(async () => container.querySelector('input[type=checkbox]').click()); await act(async () => button('Crear enlace').click());
  await act(async () => new Promise(resolve => timeout(resolve, 30)));
  assert.match(container.querySelector('[role=alert]').textContent, /tardó demasiado/); assert.equal(button('Actualizar enlaces').disabled, false);
  await act(async () => release({ data: { id: 'old', token, expiresAt: expiry }, error: null })); assert.equal(container.querySelector('input[readonly]'), null);
});
