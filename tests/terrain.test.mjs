import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleRoute,makeProfile,terrainClass,coloredPieces,loadTerrain} from '../dist/terrain.mjs';
import {cleanHistory,addHistory,encodeHistory,compactLine} from '../dist/history.mjs';
const line=[{lat:42,lon:21},{lat:42,lon:21.2},{lat:42.2,lon:21.2}];
test('Samples cover both ends and the whole route while provider batches stay within limits',()=>{
 const samples=sampleRoute(line,{spacingKm:.1,maxPoints:400});assert.equal(samples.length,Math.min(400,Math.ceil(samples.at(-1).km/.1)+1));
 assert.equal(samples[0].km,0);assert.equal(samples[0].lat,line[0].lat);assert.equal(samples.at(-1).lat,line.at(-1).lat);
 const two=sampleRoute(line,{maxPoints:2}),profile=makeProfile(two,[100,200]);assert.equal(coloredPieces(line,profile)[0].line.length,3,'The bend must survive coloring; do not draw a shortcut');
});
test('Grade reflects uphill/downhill direction and gaps never become zero-meter samples',()=>{
 assert.equal(terrainClass(4),'high');assert.equal(terrainClass(1.5),'up');assert.equal(terrainClass(-1.5),'down');assert.equal(terrainClass(0),'level');assert.equal(terrainClass(null),'unknown');
 const samples=Array.from({length:8},(_,i)=>({lat:42,lon:21+i*.01,km:i}));
 const profile=makeProfile(samples,[0,0,60,120,120,100,80,null]);assert.ok(profile.segments.some(s=>s.key==='high'));assert.ok(profile.segments.some(s=>s.key==='down'));assert.equal(profile.points.at(-1).elevation,null);assert.equal(profile.segments.at(-1).key,'unknown');assert.ok(profile.coverage<1);assert.equal(profile.min,0);
});
test('Elevation requests are aligned to all samples and never exceed 100 coordinates',async()=>{
 let calls=0;const profile=await loadTerrain(line,{request:async url=>{calls++;const count=new URL(url).searchParams.get('latitude').split(',').length;assert.ok(count<=100);return {elevation:Array(count).fill(500)};}});
 assert.equal(profile.coverage,1);assert.equal(profile.ascent,0);assert.deepEqual(profile.sources,['open-meteo']);assert.ok(calls>=2);
});
test('Fallback uses its own schema and complete service failure leaves an unknown route',async()=>{
 const short=[{lat:42,lon:21},{lat:42.01,lon:21.01}];
 const fallback=await loadTerrain(short,{request:async url=>{if(url.includes('open-meteo'))throw Error('unavailable');const count=new URL(url).searchParams.get('locations').split('|').length;return {status:'OK',results:Array.from({length:count},()=>({elevation:250}))};}});
 assert.equal(fallback.coverage,1);assert.deepEqual(fallback.sources,['opentopodata']);
 let calls=0;const unknown=await loadTerrain(line,{request:async()=>{calls++;throw Error('offline');}});assert.equal(unknown.coverage,0);assert.equal(calls,2);assert.ok(unknown.segments.every(s=>s.key==='unknown'));
 const controller=new AbortController();controller.abort();await assert.rejects(loadTerrain(line,{signal:controller.signal}),{name:'AbortError'});
});
test('History persists route geometry and profile, deduplicates searches and rejects corrupt entries',()=>{
 const samples=sampleRoute(line),terrain=makeProfile(samples,samples.map((_,i)=>100+i),{sources:['open-meteo'],fetchedAt:new Date().toISOString()});
 const route={mode:'route',center:line.at(-1),start:line[0],line,routeKm:40,query:'Destination',origin:'Origin',options:{connector:'all'},terrain};
 let history=addHistory([],route);history=addHistory(history,route);assert.equal(history.length,1);
 const restored=cleanHistory(JSON.parse(encodeHistory(history)));assert.equal(restored.length,1);assert.deepEqual(restored[0].terrain.points,terrain.points);assert.equal(restored[0].start.lat,42);
 assert.equal(cleanHistory([{...route,center:{lat:999,lon:0}}]).length,0);assert.equal(cleanHistory([{...route,routeKm:NaN}]).length,0);
 for(let i=0;i<40;i++)history=addHistory(history,{mode:'place',center:{lat:41+i*.01,lon:21},query:String(i),options:{connector:'all'}});assert.equal(history.length,30);
 const detailed=Array.from({length:5000},(_,i)=>({lat:42+i*.00001,lon:21+Math.sin(i/20)*.001})),compact=compactLine(detailed);assert.ok(compact.length<=2000);assert.deepEqual(compact[0],detailed[0]);assert.equal(compact.at(-1).lat,Number(detailed.at(-1).lat.toFixed(6)));
});
