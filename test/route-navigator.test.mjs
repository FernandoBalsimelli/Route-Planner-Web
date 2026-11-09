import assert from 'node:assert/strict';
import {after,afterEach,test} from 'node:test';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {navigationRoute} from './fixtures/route-navigation.mjs';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://route-planner.example.test'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true},React:{value:React,configurable:true}});
Object.defineProperty(window,'isSecureContext',{value:true});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let visible='visible',watchCount=0,cleared=[],callbacks=[],root,container,positions=[];
Object.defineProperty(document,'visibilityState',{get:()=>visible,configurable:true});
Object.defineProperty(navigator,'geolocation',{value:{watchPosition(ok,fail,options){assert.equal(options.enableHighAccuracy,true);watchCount++;callbacks.push({ok,fail});return watchCount;},clearWatch(id){cleared.push(id);}},configurable:true});
const {createRoot}=await import('react-dom/client');
const {default:Navigator}=await import('../components/RouteNavigator.tsx');
const props={route:navigationRoute,truck:true,onPosition:p=>positions.push(p),onFollow:()=>{}};
const button=()=>container.querySelector('.primary-button');
const fix=(lat=25,lng=-99.9995,accuracy=10)=>({coords:{latitude:lat,longitude:lng,accuracy,speed:null},timestamp:Date.now()});
async function mount(){watchCount=0;cleared=[];callbacks=[];positions=[];visible='visible';container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(React.createElement(Navigator,props)));}
async function start(){await act(async()=>container.querySelector('.navigation-consent input').click());await act(async()=>button().click());}
afterEach(async()=>{await act(async()=>root?.unmount());container?.remove();});after(()=>dom.window.close());
test('GPS starts only after a truck review and stops cleanly without accepting late callbacks',async()=>{
 await mount();assert.equal(watchCount,0);assert.equal(button().disabled,true);await start();assert.equal(watchCount,1);
 await act(async()=>callbacks[0].ok(fix()));assert.match(container.textContent,/Gira a la izquierda/);assert.deepEqual(positions.at(-1),{lat:25,lng:-99.9995});
 await act(async()=>callbacks[0].ok(fix(25.01,-99.999)));assert.match(container.textContent,/fuera del trazado/);assert.equal(container.querySelector('.next-maneuver'),null);
 await act(async()=>button().click());assert.deepEqual(cleared,[1]);assert.equal(positions.at(-1),null);
 await act(async()=>callbacks[0].ok(fix()));assert.match(container.textContent,/Navegación detenida/);assert.equal(positions.at(-1),null);
});
test('background pause clears watch and hidden GPS; resume restarts, errors and stale fixes suppress guidance',async()=>{
 await mount();await start();await act(async()=>callbacks[0].ok(fix()));
 visible='hidden';await act(async()=>document.dispatchEvent(new window.Event('visibilitychange')));assert.deepEqual(cleared,[1]);assert.equal(positions.at(-1),null);assert.match(container.textContent,/en pausa/);
 visible='visible';await act(async()=>document.dispatchEvent(new window.Event('visibilitychange')));assert.equal(watchCount,2);
 await act(async()=>callbacks[1].ok({...fix(),timestamp:Date.now()-60000}));assert.match(container.textContent,/antigua/);assert.equal(container.querySelector('.next-maneuver'),null);
 await act(async()=>callbacks[1].fail({code:1}));assert.match(container.textContent,/Permiso de ubicación denegado/);assert.equal(positions.at(-1),null);
});
test('changing the route or leaving the planner ends the GPS session and requires a new explicit start',async()=>{
 await mount();await start();await act(async()=>root.render(React.createElement(Navigator,{...props,route:{...navigationRoute}})));assert.equal(button().textContent,'Iniciar navegación en la app');assert.equal(button().disabled,true);assert.deepEqual(cleared,[1]);
 await act(async()=>root.render(React.createElement(Navigator,props)));await start();assert.equal(watchCount,2);
 await act(async()=>root.render(React.createElement(Navigator,{...props,active:false})));assert.equal(button().textContent,'Iniciar navegación en la app');assert.deepEqual(cleared,[1,2]);
});
