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


test('road preferences disable incompatible optimization and abort stale calculations when changed', async () => {
  let complete, plannedBody, signal;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/v1/routes/plan')) {
      plannedBody = JSON.parse(options.body); signal = options.signal;
      return new Promise(resolve => { complete = resolve; });
    }
    return Response.json({ ok: true, suggestions: [] });
  };
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(Home)));
  for (let i = 0; i < 2; i++) await act(async () => button('Agregar parada').click());
  for (const [index, input] of [...container.querySelectorAll('.route-form .field input')].entries()) await fill(input, `Punto de prueba ${index}`);
  const optimize = container.querySelector('.optimize-toggle input');
  await act(async () => optimize.click());
  assert.equal(optimize.checked, true);
  const [tolls, highways] = container.querySelectorAll('.road-preferences input');
  await act(async () => tolls.click());
  assert.equal(optimize.checked, false);
  assert.equal(optimize.disabled, true);
  await act(async () => button('Calcular ruta').click());
  assert.deepEqual(plannedBody.preferences, { avoidTolls: true, avoidHighways: false });
  assert.equal(plannedBody.optimize, false);
  await act(async () => highways.click());
  assert.equal(signal.aborted, true);
  await act(async () => complete(Response.json({ ok: true, route: { distanceMeters: 12345, durationSeconds: 300, sections: [] } })));
  assert.equal(container.querySelector('.metrics'), null);
  assert.equal(container.querySelector('.error-box'), null);
});


test('truck configuration fills axles, reaches the API, cancels stale calculations and validates before network access', async () => {
  let complete, plannedBody, signal, calls = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/v1/routes/plan')) {
      calls++; plannedBody = JSON.parse(options.body); signal = options.signal;
      return new Promise(resolve => { complete = resolve; });
    }
    return Response.json({ ok: true, suggestions: [] });
  };
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(Home)));
  await act(async () => button('Camión').click());
  for (const [index, input] of [...container.querySelectorAll('.route-form .field input')].entries()) await fill(input, `Punto de prueba ${index}`);
  const configuration = container.querySelector('[aria-label="Configuración vehicular"]');
  await act(async () => { configuration.value = 'T3-S2'; configuration.dispatchEvent(new window.Event('change', { bubbles: true })); });
  const [axes, capacity] = container.querySelectorAll('.vehicle-operating-fields input');
  assert.equal(axes.value, '5'); assert.equal(axes.readOnly, true);
  await fill(capacity, '30.125');
  await act(async () => button('Calcular ruta').click());
  assert.equal(plannedBody.vehicle.axleCount, 5); assert.equal(plannedBody.vehicle.configuration, 'T3-S2'); assert.equal(plannedBody.vehicle.payloadCapacityT, 30.125);
  await fill(capacity, '32'); assert.equal(signal.aborted, true);
  await act(async () => complete(Response.json({ ok: true, route: { distanceMeters: 12345, durationSeconds: 300, sections: [] } })));
  assert.equal(container.querySelector('.metrics'), null);
  await fill(capacity, '3.4999');
  await act(async () => button('Calcular ruta').click());
  assert.equal(calls, 1); assert.match(container.querySelector('.error-box').textContent, /máximo de tres decimales/);
  assert.doesNotMatch(container.querySelector('.error-box').textContent, /conectar/);
  await act(async () => { configuration.value = ''; configuration.dispatchEvent(new window.Event('change', { bubbles: true })); });
  assert.equal(axes.readOnly, false); assert.equal(axes.value, '5');
});

test('alternative selection replaces metrics and geometry without another API call, and new deliveries disable the request',async()=>{
 let calls=0,body;
 const primary={distanceMeters:3000,durationSeconds:600,polyline:undefined,sections:[],waypoints:[{type:'origin',lat:25.67,lng:-100.31,label:'Origen'},{type:'destination',lat:25.68,lng:-100.32,label:'Destino'}]};
 const alternative={...primary,distanceMeters:4500,durationSeconds:720};
 globalThis.fetch=async(url,options)=>{if(url.endsWith('/routes/plan')){calls++;body=JSON.parse(options.body);return Response.json({ok:true,route:primary,alternatives:[alternative]});}return Response.json({suggestions:[]});};
 container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(Home)));
 const inputs=[...container.querySelectorAll('.route-form .field input')];await fill(inputs[0],'Origen de prueba');await fill(inputs[1],'Destino de prueba');
 const toggle=container.querySelector('.alternative-toggle input');await act(async()=>toggle.click());await act(async()=>button('Calcular ruta').click());
 assert.equal(body.alternatives,true);assert.match(container.querySelector('.metrics').textContent,/3.0 km/);
 await act(async()=>container.querySelectorAll('.route-alternatives button')[1].click());assert.match(container.querySelector('.metrics').textContent,/4.5 km/);assert.equal(calls,1);assert.equal(container.querySelectorAll('.route-alternatives button')[1].getAttribute('aria-pressed'),'true');
 await act(async()=>button('Agregar parada').click());assert.equal(toggle.disabled,true);assert.equal(toggle.checked,false);assert.equal(container.querySelector('.route-alternatives'),null);
});
test('a single alternative result is explained without fabricating more choices',async()=>{
 globalThis.fetch=async(url)=>url.endsWith('/routes/plan')?Response.json({ok:true,route:{distanceMeters:1000,durationSeconds:100,sections:[],waypoints:[]},alternatives:[]}):Response.json({suggestions:[]});
 container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(Home)));
 for(const [i,input]of[...container.querySelectorAll('.route-form .field input')].entries())await fill(input,`Punto de prueba ${i}`);
 await act(async()=>container.querySelector('.alternative-toggle input').click());await act(async()=>button('Calcular ruta').click());assert.match(container.querySelector('.route-alternatives').textContent,/un solo recorrido/);assert.equal(container.querySelectorAll('.route-alternatives button').length,0);
});
