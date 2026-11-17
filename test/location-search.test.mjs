import assert from 'node:assert/strict';
import {test,afterEach} from 'node:test';
import {fetchLocationSuggestions,LocationSearchError} from '../lib/location-search.ts';
const savedFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=savedFetch;});
const point={label:'Sucursal pública',lat:25.7,lng:-100.3};
const failure=code=>error=>error instanceof LocationSearchError&&error.code===code;

test('search returns suggestions and provider warning without altering the points',async()=>{
 globalThis.fetch=async()=>Response.json({ok:true,suggestions:[point],warning:'NO_NEARBY_MATCHES'});
 assert.deepEqual(await fetchLocationSuggestions('/locations'),{suggestions:[point],warning:'NO_NEARBY_MATCHES'});
});
test('search reports a transport failure without exposing the raw fetch error',async()=>{
 globalThis.fetch=async()=>{throw new TypeError('Failed to fetch private diagnostic');};
 await assert.rejects(fetchLocationSuggestions('/locations'),error=>failure('LOCATION_NETWORK_ERROR')(error)&&!error.message.includes('private diagnostic')&&/conectar/.test(error.message));
});
test('HTTP rejection retains the provider code, message and status',async()=>{
 globalThis.fetch=async()=>Response.json({code:'PHOTON_UNAVAILABLE',message:'Proveedor alterno no disponible.'},{status:503});
 await assert.rejects(fetchLocationSuggestions('/locations'),error=>failure('PHOTON_UNAVAILABLE')(error)&&error.status===503&&error.message==='Proveedor alterno no disponible.');
});
test('non-JSON HTTP rejection preserves the HTTP cause including rate limits',async()=>{
 for(const status of [429,502]){
  globalThis.fetch=async()=>new Response('<html>error</html>',{status});
  await assert.rejects(fetchLocationSuggestions('/locations'),error=>failure('LOCATION_HTTP_ERROR')(error)&&error.status===status&&error.message.includes(String(status)));
 }
});
test('malformed successful responses are errors while a genuine empty list remains usable',async()=>{
 for(const body of ['not JSON','null','{}','{"suggestions":{}}','{"ok":false,"suggestions":[]}']){
  globalThis.fetch=async()=>new Response(body,{status:200});
  await assert.rejects(fetchLocationSuggestions('/locations'),failure('LOCATION_INVALID_RESPONSE'));
 }
 globalThis.fetch=async()=>Response.json({suggestions:[]});
 assert.deepEqual((await fetchLocationSuggestions('/locations')).suggestions,[]);
});
test('deadline releases an unresponsive fetch even if it ignores abort',async()=>{
 let signal;globalThis.fetch=async(_url,options)=>{signal=options.signal;return new Promise(()=>{});};
 await assert.rejects(fetchLocationSuggestions('/locations',undefined,15),failure('LOCATION_SEARCH_TIMEOUT'));assert.equal(signal.aborted,true);
});
test('deadline covers a response body that stalls after successful headers',async()=>{
 let signal;globalThis.fetch=async(_url,options)=>{signal=options.signal;return {ok:true,status:200,json:()=>new Promise(()=>{})};};
 await assert.rejects(fetchLocationSuggestions('/locations',undefined,15),failure('LOCATION_SEARCH_TIMEOUT'));assert.equal(signal.aborted,true);
});
test('caller cancellation settles promptly and a pre-cancelled search never starts a fetch',async()=>{
 const controller=new AbortController();let calls=0,child;
 globalThis.fetch=async(_url,options)=>{calls++;child=options.signal;return new Promise(()=>{});};
 const pending=fetchLocationSuggestions('/locations',controller.signal);controller.abort();
 await assert.rejects(pending,error=>error.name==='AbortError');assert.equal(child.aborted,true);
 await assert.rejects(fetchLocationSuggestions('/locations',controller.signal),error=>error.name==='AbortError');assert.equal(calls,1);
});
