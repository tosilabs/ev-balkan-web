import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherKind,weatherAdvisories,routeWeatherPoints,fetchWeather,selectForecast,radarFrames,radarTile} from '../dist/weather.mjs';
const now=Date.now(),hour=Math.ceil(now/3600000)*3600;
const data={locations:[{time:[hour,hour+3600,hour+7200],temperature_2m:[-2,1,10],precipitation:[1,0,0],precipitation_probability:[90,10,0],snowfall:[.5,0,0],weather_code:[71,2,0],wind_gusts_10m:[80,30,10],wind_speed_10m:[40,10,5],visibility:[150,10000,20000]}, {time:[hour,hour+3600,hour+7200],temperature_2m:[20,25,30],weather_code:[0,0,0]}]};
test('Weather points include route endpoints with bounded sampling',()=>{
 const line=[{lat:42,lon:21},{lat:45,lon:25}],points=routeWeatherPoints(line,line[0]);assert.ok(points.length<=10);assert.equal(points[0].km,0);assert.equal(points.at(-1).lat,45);assert.equal(routeWeatherPoints(null,line[0]).length,1);
});
test('Forecast hour follows approximate route arrival and unknown values never become zero',()=>{
 const points=[{lat:42,lon:21,km:0},{lat:43,lon:22,km:100}];
 const result=selectForecast(data,points,{departure:hour*1000,duration:7200});assert.equal(result[1].temperature,30);assert.equal(result[0].temperature,-2);assert.equal(result[1].precipitation,null);assert.equal(result[1].gusts,null);
 const current=selectForecast(data,points,{departure:hour*1000,duration:7200,arrival:false});assert.equal(current[1].temperature,20);
 const missing=selectForecast({locations:[{time:[hour],temperature_2m:[null]}]},[points[0]],{departure:hour*1000});assert.equal(missing[0].temperature,null);assert.equal(missing[0].kind.name,'Pa të dhëna');assert.equal(missing[0].advisories.length,0);
});
test('App advisories are derived transparently from weather, never assert measured road ice',()=>{
 const row=selectForecast(data,[{lat:42,lon:21,km:0},{lat:43,lon:22,km:100}],{departure:hour*1000})[0];
 assert.ok(row.advisories.some(a=>a.key==='snow'));assert.ok(row.advisories.some(a=>a.key==='wind'&&a.level==='high'));assert.ok(row.advisories.some(a=>a.key==='visibility'));assert.ok(row.advisories.some(a=>a.key==='ice'&&a.label.includes('Mundësi')));
 assert.equal(weatherKind(99).name,'Stuhi');assert.equal(weatherAdvisories({temperature:-10,precipitation:null,gusts:null,snowfall:null,visibility:null,code:null}).length,0);
});
test('Forecast fetching batches coordinates, memoizes briefly and rejects missing datasets',async()=>{
 const points=[{lat:42,lon:21,km:0},{lat:43,lon:22,km:100}];let calls=0;
 const request=async url=>{calls++;assert.equal(new URL(url).searchParams.get('timeformat'),'unixtime');return data.locations.map(hourly=>({hourly}));};
 await fetchWeather(points,{request,now:1000});await fetchWeather(points,{request,now:2000});assert.equal(calls,1);await fetchWeather(points,{request,now:2000,force:true});assert.equal(calls,2);
 await assert.rejects(fetchWeather([{lat:44,lon:23,km:0}],{request:async()=>({hourly:{}})}),/vlefshëm/);
});
test('Radar uses recent past frames, rejects foreign hosts, and never treats forecast frames as observations',()=>{
 const seconds=Math.floor(now/1000),input={host:'https://tilecache.rainviewer.com',radar:{past:[{time:seconds-1200,path:'/v2/radar/123'},{time:seconds-600,path:'/v2/radar/124'}],nowcast:[{time:seconds+1800,path:'/v2/radar/125'}]}};
 const result=radarFrames(input,now);assert.equal(result.frames.length,2);assert.match(radarTile(result,1),/124\/256\/\{z\}\/\{x\}\/\{y\}\/2\/1_1.png/);
 assert.throws(()=>radarFrames({...input,host:'https://evil.example'}));assert.throws(()=>radarFrames({...input,radar:{past:[{time:seconds-8000,path:'/v2/radar/123'}]}},now));
 assert.throws(()=>radarFrames({...input,radar:{past:[{time:seconds,path:'/../../image'}]}},now));
});
