import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCharging,containsBounds} from '../dist/services.mjs';
import {localPlaces} from '../dist/cities.mjs';
const box=[41.8,21.2,42.1,21.6];
const snapshot={bounds:[34,12,48.5,30],fetchedAt:'2026-11-02T12:00:00Z',elements:[{type:'node',id:1,lat:42,lon:21.4},{type:'node',id:2,lat:45,lon:22}]};
test('Regional queries use downloaded registry without waiting for any public API',async()=>{
  const urls=[];
  const data=await loadCharging(box,new AbortController().signal,{request:async url=>{urls.push(url);return snapshot;}});
  assert.equal(urls.length,1);assert.match(urls[0],/charging-balkans.json$/);assert.equal(data.elements.length,1);assert.equal(data.cached,true);assert.equal(data.fetchedAt,snapshot.fetchedAt);
});
test('An empty in-region result is valid and does not start external requests',async()=>{
  let calls=0;const data=await loadCharging([40,20,40.1,20.1],new AbortController().signal,{request:async()=>{calls++;return snapshot;}});
  assert.equal(calls,1);assert.deepEqual(data.elements,[]);
});
test('Missing registry and failed first service use the remaining service',async()=>{
  const urls=[];
  const data=await loadCharging(box,new AbortController().signal,{request:async url=>{urls.push(url);if(urls.length<3)throw Error('Service unavailable');return {elements:[]};}});
  assert.equal(urls.length,3);assert.deepEqual(data.elements,[]);assert.match(urls[1],/kumi/);assert.match(urls[2],/overpass-api/);
});
test('Registry does not silently claim coverage outside its bounds',async()=>{
  assert.equal(containsBounds(snapshot.bounds,[33,21,34,22]),false);
  let calls=0;await loadCharging([33,21,34,22],new AbortController().signal,{request:async()=>++calls===1?snapshot:{elements:[]}});assert.equal(calls,2);
});
test('Cancellation never starts fallback requests',async()=>{
  const controller=new AbortController();let calls=0;
  await assert.rejects(loadCharging(box,controller.signal,{request:async()=>{calls++;controller.abort();throw new DOMException('Cancelled','AbortError');}}),{name:'AbortError'});
  assert.equal(calls,1);
});
test('Common Balkan city names work without Photon, including diacritics and local scripts',()=>{
  for(const q of ['Shkup','Skopje','Скопје','Shkup, Maqedonia e Veriut'])assert.equal(localPlaces(q)[0].point.lat,41.9981);
  assert.equal(localPlaces('Prishtinë')[0].point.lat,42.6629);assert.equal(localPlaces('Kyustendil')[0].point.lat,42.2839);
  assert.equal(localPlaces('Unknown Road 1000').length,0);assert.equal(localPlaces('Barcelona').length,0);
});
