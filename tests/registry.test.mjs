import test from 'node:test';
import assert from 'node:assert/strict';
import {regionalRegistry} from '../dist/registry.mjs';
test('Regional lookup fetches only intersecting nonempty cells and rejects mismatched snapshot parts',async()=>{
 const urls=[],stamp='2026-11-02T00:00:00Z';const data=await regionalRegistry([41.9,21.2,42.1,21.6],{request:async url=>{urls.push(url);if(url.includes('registry-index'))return {schema:1,bounds:[34,12,48.5,30],fetchedAt:stamp,builtAt:stamp,tiles:{'41_21':{count:1},'42_21':{count:1},'45_22':{count:2},'43_21':{count:1}}};return {builtAt:stamp,elements:[{lat:url.includes('41_21')?41.99:42.01,lon:21.4,id:url.includes('41_21')?1:2,type:'node'}]};}});
 assert.equal(data.elements.length,2);assert.equal(urls.length,3);assert.ok(urls.every(u=>!u.includes('45_22')));
 await assert.rejects(regionalRegistry([43,21,43.5,21.5],{request:async()=>({builtAt:'old',elements:[]})}),/përputhet/);
});
