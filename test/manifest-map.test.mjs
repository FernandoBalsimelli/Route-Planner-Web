import assert from 'node:assert/strict';
import { test } from 'node:test';
import { manifestMapPoint } from '../lib/manifest-map.ts';

const point={label:'Express norte',lat:25.7,lng:-100.3,plusCode:'TEST',numberMatch:'missing'};
const search={requestId:'request-one',candidateId:'delivery-one',value:'Consulta original',title:'Entrega 1 del manifiesto',points:[point]};
const rows=[{id:'delivery-one',value:'Consulta original',enabled:true},{id:'delivery-two',value:'Otra consulta',enabled:true}];
const selection={requestId:'request-one',point:{...point,plusCode:'untrusted'}};
const choose=(request=search,pick=selection,currentRows=rows,activeId='delivery-one',active=true)=>manifestMapPoint(request,pick,currentRows,activeId,active);

test('map confirmation uses the exact canonical suggestion with its source metadata',()=>{
  assert.equal(choose(),point);assert.equal(choose().plusCode,'TEST');assert.equal(choose().numberMatch,'missing');
});
test('outdated requests and another active delivery never confirm a row',()=>{
  assert.equal(choose(null),null);assert.equal(choose(search,{...selection,requestId:'older-request'}),null);
  assert.equal(choose(search,selection,rows,'delivery-two'),null);
  assert.equal(choose(search,selection,rows,'delivery-one',false),null);
});
test('editing, excluding or replacing prepared deliveries invalidates a map selection',()=>{
  assert.equal(choose(search,selection,[{...rows[0],value:'Changed address'}]),null);
  assert.equal(choose(search,selection,[{...rows[0],enabled:false}]),null);
  assert.equal(choose(search,selection,[]),null);
});
test('a map selection must belong to its batch and contain valid coordinates',()=>{
  for(const other of [{...point,label:'Other branch'},{...point,lat:25.71},{...point,lng:-100.31}])assert.equal(choose(search,{...selection,point:other}),null);
  for(const invalid of [{...point,lat:NaN},{...point,lat:91},{...point,lng:181}])assert.equal(choose({...search,points:[invalid]},{...selection,point:invalid}),null);
});
