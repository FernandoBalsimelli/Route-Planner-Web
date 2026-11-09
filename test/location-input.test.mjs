import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import React, { act, useState } from 'react';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://route-planner.example.test' });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
});
Object.defineProperty(window, 'isSecureContext', { value: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const { default: LocationInput } = await import('../components/LocationInput.tsx');
const { default: RouteStops } = await import('../components/RouteStops.tsx');
const { moveStop } = await import('../lib/route-stops.ts');
const savedFetch = globalThis.fetch;
let root, container, reverseCalls;

function Harness() {
  const [value, setValue] = useState('Origen anterior');
  const [selected, setSelected] = useState(null);
  return React.createElement(LocationInput, { title: 'Origen', color: 'green', value, placeholder: 'Origen', apiUrl: '/api/route-planner', allowCurrentLocation: true, selected,
    onChange: next => { setValue(next); setSelected(null); }, onConfirm: setSelected });
}
async function render(position) {
  reverseCalls = [];
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: position });
  globalThis.fetch = async url => {
    if (url.includes('/reverse?')) { reverseCalls.push(url); return Response.json({ ok: true, location: { label: 'Dirección de prueba', plusCode: '75WMMW72+52' } }); }
    return Response.json({ ok: true, suggestions: [] });
  };
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(Harness)));
}
const button = text => [...container.querySelectorAll('button')].find(node => node.textContent.includes(text));
const success = { getCurrentPosition(ok) { ok({ coords: { latitude: 28.662926123, longitude: -106.099908456, accuracy: 16.4 } }); } };
afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); globalThis.fetch = savedFetch; });
after(() => dom.window.close());

test('GPS click confirms the precise point, resolved address and accuracy', async () => {
  await render(success);
  assert.equal(reverseCalls.length, 0);
  await act(async () => button('Usar mi ubicación').click());
  assert.equal(container.querySelector('input').value, 'Dirección de prueba');
  assert.match(container.textContent, /±17 m/);
  assert.match(container.textContent, /Punto confirmado/);
  assert.equal(new URL(reverseCalls[0], window.location.href).searchParams.get('lat'), '28.662926123');
});

test('permission denial preserves the old origin and permits retrying', async () => {
  await render({ getCurrentPosition(ok, fail) { fail({ code: 1 }); } });
  await act(async () => button('Usar mi ubicación').click());
  assert.equal(container.querySelector('input').value, 'Origen anterior');
  assert.match(container.textContent, /No se permitió el acceso/);
  assert.equal(reverseCalls.length, 0);
  assert.equal(button('Usar mi ubicación').disabled, false);
});

test('provider outage uses coordinates instead of losing the GPS fix', async () => {
  await render(success);
  globalThis.fetch = async () => Response.json({ ok: false }, { status: 503 });
  await act(async () => button('Usar mi ubicación').click());
  assert.match(container.querySelector('input').value, /Mi ubicación \(28.662926, -106.099908\)/);
  assert.match(container.textContent, /Punto confirmado/);
  assert.match(container.textContent, /No se pudo obtener la dirección legible/);
});

test('cancelling GPS ignores its late response', async () => {
  let finish;
  await render({ getCurrentPosition(ok) { finish = ok; } });
  await act(async () => button('Usar mi ubicación').click());
  await act(async () => button('Cancelar').click());
  await act(async () => finish({ coords: { latitude: 28.66, longitude: -106.09, accuracy: 10 } }));
  assert.equal(container.querySelector('input').value, 'Origen anterior');
  assert.equal(reverseCalls.length, 0);
});

test('typing during GPS lookup cancels the late result', async () => {
  let finish;
  await render({ getCurrentPosition(ok) { finish = ok; } });
  await act(async () => button('Usar mi ubicación').click());
  const input = container.querySelector('input');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Origen escrito');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await act(async () => finish({ coords: { latitude: 28.66, longitude: -106.09, accuracy: 10 } }));
  assert.equal(input.value, 'Origen escrito');
  assert.equal(reverseCalls.length, 0);
});

test('stop controls reorder the complete input and keep boundary controls disabled', async () => {
  const original = [
    { id: 'one', value: 'Primera dirección', selected: { label: 'Primera dirección', lat: 28.66, lng: -106.09 } },
    { id: 'two', value: 'Segunda dirección', selected: { label: 'Segunda dirección', lat: 28.67, lng: -106.10 } },
  ];
  function StopsHarness() {
    const [stops, setStops] = useState(original);
    return React.createElement(RouteStops, { stops, apiUrl: '/api/route-planner', onChange() {}, onConfirm() {}, onRemove() {},
      onMove: (id, direction) => setStops(items => moveStop(items, id, direction)) });
  }
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(StopsHarness)));
  assert.equal(container.querySelector('[aria-label="Subir parada 1"]').disabled, true);
  assert.equal(container.querySelector('[aria-label="Bajar parada 2"]').disabled, true);
  await act(async () => container.querySelector('[aria-label="Bajar parada 1"]').click());
  assert.deepEqual([...container.querySelectorAll('input')].map(input => input.value), ['Segunda dirección', 'Primera dirección']);
  assert.equal(container.querySelectorAll('.location-confirmed').length, 2);
});

test('keyboard selects a branch with arrows and requires explicit confirmation before using it', async () => {
  let confirmed;
  function KeyboardHarness() {
    const [value,setValue]=useState('Bodega Aurrera');const [selected,setSelected]=useState(null);
    return React.createElement(LocationInput,{title:'Destino',color:'orange',value,selected,apiUrl:'/api',placeholder:'',onChange:setValue,onConfirm:point=>{confirmed=point;setSelected(point);}});
  }
  globalThis.fetch=async()=>Response.json({suggestions:[{label:'Sucursal uno',lat:25,lng:-100},{label:'Sucursal dos',lat:25.1,lng:-100.1}]});
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
  await act(async()=>root.render(React.createElement(KeyboardHarness)));
  await act(async()=>new Promise(resolve=>setTimeout(resolve,350)));
  const input=container.querySelector('input');
  const key=async value=>act(async()=>input.dispatchEvent(new window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true})));
  await key('ArrowDown');await key('ArrowDown');
  assert.equal(container.querySelector('[role="option"][aria-selected="true"]').textContent.includes('Sucursal dos'),true);
  assert.equal(document.getElementById(input.getAttribute('aria-activedescendant')).getAttribute('role'),'option');
  await key('Enter');assert.equal(confirmed,undefined);assert.match(container.querySelector('.location-confirm-card').textContent,/Sucursal dos/);
  await key('Enter');assert.deepEqual(confirmed,{label:'Sucursal dos',lat:25.1,lng:-100.1});assert.equal(input.value,'Sucursal dos');
});

test('only the focused field publishes its search results to the shared map',async()=>{
  const published=[];
  globalThis.fetch=async()=>Response.json({suggestions:[{label:'Sucursal cercana',lat:25.72,lng:-100.32}]});
  function MapHarness(){const [value,setValue]=useState('Bodega Aurrera');return React.createElement(LocationInput,{title:'Destino',color:'orange',value,apiUrl:'/api',placeholder:'',onChange:setValue,onConfirm(){},onSuggestions:points=>published.push(points)});}
  container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(MapHarness)));
  const input=container.querySelector('input');await act(async()=>input.focus());await act(async()=>new Promise(resolve=>setTimeout(resolve,350)));
  assert.equal(published.at(-1)[0].label,'Sucursal cercana');const previousCount=published.length;
  await act(async()=>{input.blur();Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,'Otra búsqueda');input.dispatchEvent(new window.Event('input',{bubbles:true}));});
  await act(async()=>new Promise(resolve=>setTimeout(resolve,350)));assert.equal(published.length,previousCount);
});
test('an externally selected origin cancels a pending GPS fix',async()=>{
  let finish;
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(ok){finish=ok;}}});
  globalThis.fetch=async()=>Response.json({suggestions:[]});
  function ExternalHarness(){const [value,setValue]=useState('');const [selected,setSelected]=useState(null);return React.createElement(React.Fragment,null,React.createElement(LocationInput,{title:'Origen',color:'green',value,selected,apiUrl:'/api',allowCurrentLocation:true,placeholder:'',onChange:setValue,onConfirm:setSelected}),React.createElement('button',{onClick(){setValue('Origen elegido en el mapa');setSelected({label:'Origen elegido en el mapa',lat:25.72,lng:-100.32});}},'Cargar punto externo'));}
  container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(ExternalHarness)));
  await act(async()=>button('Usar mi ubicación').click());await act(async()=>button('Cargar punto externo').click());
  await act(async()=>finish({coords:{latitude:10,longitude:10,accuracy:10}}));assert.equal(container.querySelector('input').value,'Origen elegido en el mapa');
});
