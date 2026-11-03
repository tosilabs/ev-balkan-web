import test from 'node:test';
import assert from 'node:assert/strict';
import {vehicleProfile,energyForKm,chargingMinutes,compatiblePower,parseTariff,sessionCost,terrainBetween} from '../dist/energy.mjs';
import {optimizeJourney,revalidateJourney,planningCandidates} from '../dist/planner.mjs';
import {interpretQuery} from '../dist/query.mjs';
import {stationDetour,roadMatrix} from '../dist/roads.mjs';
import {stationReport,reportUrl} from '../dist/community.mjs';
const p=vehicleProfile({capacity:80,soc:40,reserve:15,consumption:20,maxDC:150,maxAC:11});
const station={id:'node/1',name:'Charger',point:{lat:42,lon:21},routePosition:10,routeOffset:.01,price:'0.45 EUR/kWh',allConnections:[{label:'CCS2',power:300,current:'DC'}]};
const matrix={distances:[[0,10000,200000],[10000,0,190000],[200000,190000,0]],durations:[[0,600,12000],[600,0,11400],[12000,11400,0]]};
test('Vehicle data is explicit; empty capacity and invalid current battery are rejected',()=>{
 assert.throws(()=>vehicleProfile({capacity:'',soc:40,consumption:20,maxDC:150}));assert.throws(()=>vehicleProfile({...p,soc:101}));assert.equal(p.temperature,null);
});
test('Energy and charging respect vehicle limits, cold, ascent and taper',()=>{
 assert.equal(energyForKm(100,p),20);assert.ok(energyForKm(100,p,{temperature:0})>20);assert.ok(energyForKm(100,{...p,mass:2500},{ascent:1000})>20);
 const power=compatiblePower(station,p);assert.equal(power.power,150);assert.ok(chargingMinutes(p,power,80,90)>chargingMinutes(p,power,20,30));assert.equal(compatiblePower({...station,allConnections:[{label:'Tesla',power:250}]},p),null);
 assert.equal(compatiblePower({...station,allConnections:[{label:'Type 2',power:22}]},p).power,11);
});
test('Unknown, ranged or conditional prices never become a zero-cost tariff',()=>{
 for(const text of ['', '0.4–0.6 EUR/kWh','from 0.4 EUR/kWh','0.4 EUR/kWh membership'])assert.equal(parseTariff(text),null);
 const t=parseTariff('0.4 EUR/kWh + 0.1 EUR/min + 1 EUR/session');assert.deepEqual(sessionCost(t,20,30),{amount:12,currency:'EUR',complete:true});assert.equal(parseTariff('0.4 EUR/kWh + parking').complete,false);assert.equal(sessionCost(null,20,30),null);
});
test('Planner requires a feasible road chain with reserve and a real charging stop',()=>{
 const result=optimizeJourney({profile:p,stations:[station],matrix,routeKm:200});assert.equal(result.stops.length,1);assert.ok(result.soc>=15);assert.ok(result.stops[0].target>result.stops[0].arrival);assert.ok(result.cost>0);
 const legs=[{distance:10000,duration:600},{distance:190000,duration:11400}],verified=revalidateJourney(result,p,{legs,line:[{lat:42,lon:21},{lat:43,lon:22}]},null,200);assert.ok(verified.soc>=15);
 assert.throws(()=>revalidateJourney(result,p,{legs:[legs[0],{distance:900000,duration:14000}]},null,200),/rezervën/);
 assert.throws(()=>optimizeJourney({profile:p,stations:[],matrix:{distances:[[0,200000],[200000,0]],durations:[[0,12000],[12000,0]]},routeKm:200}),/Nuk u gjet/);
});
test('Unknown price prevents cost optimization and budget claims; disconnected roads remain unreachable',()=>{
 assert.throws(()=>optimizeJourney({profile:p,stations:[{...station,price:''}],matrix,routeKm:200,mode:'cost'}),/tarifa/);
 const broken=structuredClone(matrix);broken.distances[1][2]=null;assert.throws(()=>optimizeJourney({profile:p,stations:[station],matrix:broken,routeKm:200}),/Nuk u gjet/);
 assert.equal(planningCandidates([station],p,{excluded:['node/1']}).length,0);
});
test('Detour compares complete routes through the same engine and never substitutes lateral distance',async()=>{
 let calls=0;const request=async url=>{calls++;const via=url.includes('21,42;21,42;22,43');return {code:'Ok',routes:[{distance:via?105000:100000,duration:via?6600:6000}]};};
 const result=await stationDetour({lat:42,lon:21},{lat:42,lon:21},{lat:43,lon:22},{request});assert.equal(result.extraKm,5);assert.equal(result.extraMinutes,10);assert.equal(calls,2);
 await assert.rejects(roadMatrix([{lat:42,lon:21},{lat:43,lon:22}],{request:async()=>({code:'Ok',distances:[[0]],durations:[[0]]})}),/nuk u mor/);
});
test('Natural Albanian query extracts a place and explicit connector/power constraints',()=>{
 const q=interpretQuery('Gjej CCS mbi 150 kW në Prishtinë');assert.equal(q.connector,'CCS2');assert.equal(q.power,150);assert.equal(q.place,'Prishtinë');assert.equal(interpretQuery('Shkup'),null);
 assert.equal(interpretQuery('Gjej CCS gjatë rrugës për Sofje').route,true);
});
test('Reports validate coordinates and open a reviewable public draft rather than silently posting',()=>{
 const r=stationReport({name:'Test charger',lat:42,lon:21,kind:'missing',power:150,connector:'CCS2'});assert.equal(r.consent,'CC BY 4.0');assert.match(reportUrl(r),/^https:\/\/github.com\/tosilabs\/ev-balkan-web\/issues\/new\?/);assert.throws(()=>stationReport({name:'Bad',lat:142,lon:21}));assert.throws(()=>stationReport({name:'Bad',lat:42,lon:21,rating:7}));
});
