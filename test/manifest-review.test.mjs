import assert from 'node:assert/strict';
import { test } from 'node:test';
import { manifestCandidates } from '../lib/manifest.ts';
import { manifestPointConfirmed, manifestReuseChoices, nextManifestReviewId, nearbyManifestLocations, repeatedManifestLines } from '../lib/manifest-review.ts';

test('manifest preserves repeated orders, their positions and more than eight deliveries', () => {
  const address='Bodega Aurrera Express, Calle Cedro 312, Chihuahua';
  const values=[address,'Calle Diferente 42, Chihuahua',...Array(47).fill(address)];
  assert.deepEqual(manifestCandidates(values.join('\n')),values);
  assert.deepEqual(repeatedManifestLines([' Calle UNO 12 ','Otra', 'calle   uno 12','']),[[1,3]]);
  assert.equal(repeatedManifestLines(values)[0].length,48);
});

const row=(value,lat,lng,extra={})=>({enabled:true,value,selected:{label:value,lat,lng},...extra});
test('nearby review uses confirmed coordinates rather than matching business names', () => {
  const rows=[row('Express centro',28.63,-106.07),row('Otra etiqueta',28.63004,-106.07),row('Express centro',28.64,-106.07)];
  const result=nearbyManifestLocations(rows);assert.equal(result.length,1);assert.equal(result[0].first,1);assert.equal(result[0].second,2);assert.ok(result[0].distanceMeters>4&&result[0].distanceMeters<5);
  assert.deepEqual(rows.map(r=>r.value),['Express centro','Otra etiqueta','Express centro']);
});

test('excluded, unconfirmed, stale or invalid points never become a nearby warning and row numbers do not shift', () => {
  const rows=[row('Same',0,0),row('excluded',0,0,{enabled:false}),row('not confirmed',0,0,{selected:null}),row('edited',0,0,{selected:{label:'old',lat:0,lng:0}}),row('bad',NaN,0),row('bad range',91,0),row('last',0,0)];
  assert.deepEqual(nearbyManifestLocations(rows),[{first:1,second:7,distanceMeters:0}]);
});

test('review keeps the ten-meter threshold precise and handles the antimeridian', () => {
  const metersToLatitude=meters=>meters/6371000*180/Math.PI;
  const base=row('zero',0,0);
  assert.equal(nearbyManifestLocations([base,row('inside',metersToLatitude(9.999),0)]).length,1);
  assert.equal(nearbyManifestLocations([base,row('outside',metersToLatitude(10.001),0)]).length,0);
  assert.equal(nearbyManifestLocations([row('west',0,-179.99999),row('east',0,179.99999)]).length,1);
});

test('guided review advances after the current row, skips exclusions and wraps to earlier unfinished orders', () => {
  const rows=Array.from({length:49},(_,i)=>({...row('Repeated Express',28.63,-106.07,{selected:null}),id:String(i+1)}));
  rows[1].enabled=false;
  rows[20].selected={label:rows[20].value,lat:28.63,lng:-106.07};
  assert.equal(nextManifestReviewId(rows),'1');
  assert.equal(nextManifestReviewId(rows,'1'),'3');
  assert.equal(nextManifestReviewId(rows,'20'),'22');
  assert.equal(nextManifestReviewId(rows,'49'),'1');
  assert.equal(nextManifestReviewId(rows,'unknown'),'1');
  assert.equal(rows.length,49,'review never removes repeated deliveries');
  for(const item of rows)item.selected={label:item.value,lat:28.63,lng:-106.07};
  assert.equal(nextManifestReviewId(rows),null);
  rows[0].value='Edited address';assert.equal(nextManifestReviewId(rows,'49'),'1');
  assert.equal(nextManifestReviewId([]),null);
  assert.equal(nextManifestReviewId(rows.map(item=>({...item,enabled:false}))),null);
});

test('guided review treats stale and out-of-range coordinates as unfinished, including coordinates equal to zero', () => {
  for(const invalid of [null,{label:'old',lat:0,lng:0},{label:'point',lat:NaN,lng:0},{label:'point',lat:91,lng:0},{label:'point',lat:0,lng:181}]){
    const candidate={id:'pending',value:'point',enabled:true,selected:invalid};
    assert.equal(manifestPointConfirmed(candidate),false);
    assert.equal(nextManifestReviewId([candidate]),'pending');
  }
  assert.equal(manifestPointConfirmed(row('point',0,0)),true);
});

const reuseRow=(id,sourceValue='Calle Uno 123',extra={})=>({id,sourceValue,...row(sourceValue,0,0,{selected:null}),...extra});
test('reuse proposes only earlier included confirmations with the same prepared text and exact original coordinates',()=>{
 const point={label:'Acceso corroborado',lat:28.630000123,lng:-106.070000456,plusCode:'75WMJWJH+22'};
 const rows=[reuseRow('a','Calle Uno 123',{value:point.label,selected:point}),reuseRow('b',' calle   UNO 123 '),reuseRow('c','Calle Uno 123',{value:point.label,selected:point})];
 assert.deepEqual(manifestReuseChoices(rows,'b'),[{position:1,point}]);
 assert.equal(rows[1].selected,null,'a proposal never confirms a repeated order');
 assert.equal(rows.length,3);
 assert.deepEqual(manifestReuseChoices(rows,'a'),[],'later confirmations are not previous deliveries');
 assert.deepEqual(manifestReuseChoices(rows,'missing'),[]);
});
test('reuse excludes removed, stale or invalid source confirmations and an edited target',()=>{
 const confirmed=reuseRow('a','Calle Uno 123',{selected:{label:'Calle Uno 123',lat:0,lng:0}}),target=reuseRow('b');
 for(const patch of [{enabled:false},{value:'Edited source point'},{selected:{label:confirmed.value,lat:91,lng:0}},{selected:null}]) assert.deepEqual(manifestReuseChoices([{...confirmed,...patch},target],'b'),[]);
 for(const patch of [{enabled:false},{value:'Calle Uno 125'},{selected:{label:target.value,lat:0,lng:0}}]) assert.deepEqual(manifestReuseChoices([confirmed,{...target,...patch}],'b'),[]);
 assert.deepEqual(manifestReuseChoices([confirmed,reuseRow('b','Calle Uno 123, otra ciudad')],'b'),[]);
 assert.deepEqual(manifestReuseChoices([reuseRow('a','Calle Peña 123',{selected:{label:'Calle Peña 123',lat:0,lng:0}}),reuseRow('b','Calle Pena 123')],'b'),[],'different spelling is not inferred to be the same address');
});
test('different confirmed accesses for identical source text remain explicit choices, including adjacent entrances',()=>{
 const a={label:'Acceso A',lat:28.630000123,lng:-106.070000456},b={label:'Acceso B',lat:28.630000124,lng:-106.070000456};
 const rows=[reuseRow('a','Tienda',{value:a.label,selected:a}),reuseRow('b','Tienda',{value:b.label,selected:b}),reuseRow('again','Tienda',{value:a.label,selected:a}),reuseRow('pending','Tienda')];
 assert.deepEqual(manifestReuseChoices(rows,'pending'),[{position:1,point:a},{position:2,point:b}]);
 assert.equal(rows.length,4,'grouping proposals never deduplicates deliveries');
 rows[1].selected={...a,label:'Otra etiqueta'};rows[1].value='Otra etiqueta';
 assert.equal(manifestReuseChoices(rows,'pending').length,2,'distinct labels are retained even at identical coordinates');
});
