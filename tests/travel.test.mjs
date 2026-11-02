import test from 'node:test';
import assert from 'node:assert/strict';
import {formatTravel,stationTravel} from '../dist/travel.mjs';
test('Driving distance and duration format separately from air distance',()=>{
 assert.deepEqual(formatTravel({distance:139000,duration:7020}),{distance:'139 km',duration:'1 h 57 min'});
 assert.deepEqual(formatTravel({distance:550,duration:100}),{distance:'0.6 km',duration:'2 min'});
 assert.throws(()=>formatTravel({distance:2000}));assert.throws(()=>formatTravel({distance:NaN,duration:20}));
});
test('Station travel uses an actual driving route, caches briefly, and fails without inventing an ETA',async()=>{
 const origin={lat:42,lon:21},target={lat:42.1,lon:21.1};let calls=0;
 const request=async url=>{calls++;assert.match(url,/overview=false/);return {code:'Ok',routes:[{distance:139000,duration:7020}]};};
 const a=await stationTravel(origin,target,{request,now:10000});assert.equal(a.distance,139000);await stationTravel(origin,target,{request,now:10001});assert.equal(calls,1);
 await assert.rejects(stationTravel(origin,{lat:43,lon:22},{request:async()=>({code:'NoRoute',routes:[]})}),/nuk u mor/);
 const controller=new AbortController();controller.abort();await assert.rejects(stationTravel(origin,target,{request,signal:controller.signal}),{name:'AbortError'});
});
