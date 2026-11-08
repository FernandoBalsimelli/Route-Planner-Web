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
const savedFrom = supabase.from, savedFetch = globalThis.fetch;
let root, container, tables, writes;
const user = { id: 'owner-one', email: 'owner@example.test' };
function database() {
  tables = { profiles: [{ id: user.id, display_name: 'Operador' }], fleets: [], vehicles: [], saved_routes: [{ id: 'route-one', name: 'Entrega anterior', owner_id: user.id, status: 'planned', created_at: '2026-11-08', origin: { label: 'Origen' }, destination: { label: 'Destino' } }] }; writes = [];
  supabase.from = table => {
    let filters = [], mode = 'read', values, singular = false;
    const query = {
      select() { return query; }, order() { return query; }, limit() { return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      neq(key, value) { filters.push(row => row[key] !== value); return query; },
      insert(value) { mode = 'insert'; values = value; return query; },
      update(value) { mode = 'update'; values = value; return query; },
      single() { singular = true; return query; }, maybeSingle() { singular = true; return query; },
      then(resolve, reject) {
        let data = tables[table].filter(row => filters.every(filter => filter(row)));
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
