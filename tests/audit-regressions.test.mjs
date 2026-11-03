import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTariff,vehicleProfile,terrainBetween,weatherBetween} from '../dist/energy.mjs';
import {optimizeJourney,revalidateJourney} from '../dist/planner.mjs';
import {interpretQuery} from '../dist/query.mjs';
import {finesSnapshot} from '../dist/operating.mjs';
import {createRegionalRegistry} from '../dist/registry.mjs';
import {approvedReport} from '../scripts/community-approval.mjs';

test('Free parking and conditional charging never become a free charging tariff',()=>{
 const price=parseTariff('Free parking; charging 0.50 EUR/kWh');assert.equal(price.energy,.5);assert.equal(price.complete,false);
 for(const text of ['not free','free for members','-0.50 EUR/kWh','0.4 EUR/kWh or 0.6 EUR/kWh'])assert.equal(parseTariff(text),null);
 assert.equal(parseTariff('0.4 EUR/kWh + 0.1 EUR/min + 2 EUR').complete,false);
 assert.equal(parseTariff('Pa pagesë, sipas regjistrit').energy,0);
});
test('Malformed elevations remain unknown and cannot produce NaN battery estimates',()=>{
 const extra=terrainBetween({points:[{km:0},{km:10,elevation:200},{km:20,elevation:NaN}]},0,20);
 assert.equal(extra.ascent,0);assert.equal(extra.descent,0);assert.equal(extra.coverage,0);assert.equal(weatherBetween([null,{km:0,temperature:12}],0,10),12);
});
test('The actual road route recalculates charging energy/cost and enforces the budget again',()=>{
 const p=vehicleProfile({capacity:80,soc:40,reserve:15,consumption:20,maxDC:150,maxAC:11});
 const station={id:'node/1',name:'A',routePosition:10,price:'0.45 EUR/kWh',allConnections:[{label:'CCS2',power:150}]};
 const matrix={distances:[[0,10000,200000],[10000,0,190000],[200000,190000,0]],durations:[[0,600,12000],[600,0,11400],[12000,11400,0]]};
 const plan=optimizeJourney({profile:p,stations:[station],matrix,routeKm:200});
 const actual={legs:[{distance:11000,duration:660},{distance:190000,duration:11400}],line:[{lat:42,lon:21},{lat:43,lon:22}]};
 const checked=revalidateJourney(plan,p,actual,null,200);assert.ok(checked.cost>plan.cost);assert.ok(checked.stops[0].energy>plan.stops[0].energy);
 assert.throws(()=>revalidateJourney({...plan,budget:plan.cost+.01},p,actual,null,200),/buxhetin/);
 assert.throws(()=>revalidateJourney(plan,p,{...actual,legs:[{distance:-1,duration:600},actual.legs[1]]},null,200),/paplotë/);
});
test('Cancelling one screen does not abort another subscriber of the shared operator request',async()=>{
 let resolveFeed,calls=0;const signal=new AbortController(),now=Date.now()+1e9;
 const request=async(url,options)=>{calls++;assert.equal(options.signal,undefined);return new Promise(resolve=>resolveFeed=resolve);};
 const first=finesSnapshot({signal:signal.signal,request,now}),second=finesSnapshot({request,now});
 await Promise.resolve();signal.abort();await assert.rejects(first,{name:'AbortError'});resolveFeed({locations:[]});assert.deepEqual(await second,{locations:[]});assert.equal(calls,1);
});
test('Concurrent regional requests keep their own snapshot while a newer index is loaded',async()=>{
 let at=0,resolveOld;const load=createRegionalRegistry({now:()=>at}),a='2026-11-03T00:00:00Z',b='2026-11-03T01:00:00Z';
 const index=stamp=>({schema:1,bounds:[34,12,48.5,30],fetchedAt:stamp,builtAt:stamp,tiles:{'42_21':{count:1}}});
 const old=load([42,21,42.1,21.1],{request:async url=>url.includes('registry-index')?index(a):new Promise(resolve=>resolveOld=resolve)});
 await Promise.resolve();await Promise.resolve();at=700000;
 const next=await load([42,21,42.1,21.1],{request:async url=>url.includes('registry-index')?index(b):{builtAt:b,elements:[{lat:42.01,lon:21.01,id:2}]}});
 resolveOld({builtAt:a,elements:[{lat:42.01,lon:21.01,id:1}]});assert.equal((await old).builtAt,a);assert.equal(next.builtAt,b);assert.equal(next.elements[0].id,2);
});
test('An edited report must be approved again and future observations are rejected',()=>{
 const stamp='2026-11-03T00:00:00Z',report={name:'A',lat:42,lon:21,observedAt:stamp,consent:'CC BY 4.0'};
 const issue={number:1,labels:[{name:'station-approved'}],updated_at:stamp,body:'<!-- udhembare-report-v1 -->\n```json\n'+JSON.stringify(report)+'\n```',html_url:'https://github.com/tosilabs/ev-balkan-web/issues/1'};
 const events=[{event:'labeled',label:{name:'station-approved'},created_at:stamp}];
 assert.ok(approvedReport(issue,events,Date.parse(stamp)));assert.equal(approvedReport({...issue,updated_at:'2026-11-03T01:00:00Z'},events),null);
 assert.equal(approvedReport(issue,[{...events[0],event:'unlabeled'}]),null);assert.equal(approvedReport(issue,events,Date.parse(stamp)-600000),null);
});
test('Albanian query extracts a location without treating "në punë" as a town',()=>{
 const q=interpretQuery('Gjej CCS në punë pranë Prishtinës');assert.equal(q.place,'Prishtinës');assert.equal(q.active,true);assert.equal(q.connector,'CCS2');
 assert.equal(interpretQuery('Gjej CCS në Shkup në punë').place,'Shkup');
});
