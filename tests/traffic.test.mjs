import test from 'node:test';
import assert from 'node:assert/strict';
import {trafficArea,parseTraffic,visibleTraffic,trafficFeatures,fetchTraffic,reserveTrafficBudget} from '../dist/traffic-core.mjs';
import {createKeyVault} from '../dist/key-vault.mjs';
const now=Date.now(),center={lat:42,lon:21},area=trafficArea({center});
const alert=(id,type='POLICE',at=now)=>({alert_id:id,type,latitude:42,longitude:21.001,street:'Rruga A',publish_datetime_utc:new Date(at).toISOString()});
test('Traffic separates police from cameras, rejects old/future/malformed reports and deduplicates',()=>{
 const payload={data:{alerts:[alert('one'),alert('one'),alert('old','POLICE',now-7200000),alert('future','HAZARD',now+600000),alert('camera','SPEED_CAMERA'),{...alert('null'),latitude:null},alert('accident','ACCIDENT')],jams:[]}};
 const result=parseTraffic(payload,area,now);assert.equal(result.alerts.length,2);assert.equal(result.alerts[0].label,'Polici e raportuar');assert.ok(!result.alerts.some(a=>a.label.includes('radar')));assert.equal(visibleTraffic(result,now+600001),null);
 assert.throws(()=>parseTraffic({status:'ERROR'},area,now),/formatin/);
});
test('Route requests cover one upcoming 20km corridor, and a far-away manual route starts at its origin',()=>{
 const line=[center,{lat:42,lon:22}];const corridor=trafficArea({center,line,mode:'route'});assert.ok(corridor.box[3]<21.3);assert.match(corridor.label,/20 km/);
 const parsed=parseTraffic({alerts:[alert('inside'),{...alert('outside'),latitude:42.05}],jams:[]},corridor,now);assert.equal(parsed.alerts.length,1);
 assert.match(trafficArea({center:{lat:45,lon:25},line,mode:'route'}).label,/nga nisja/);
});
test('Jams require recent timestamps and valid geometry; map features preserve distinct geometry types',()=>{
 const data=parseTraffic({alerts:[alert('a')],jams:[{jam_id:'j',update_datetime_utc:new Date(now).toISOString(),level:4,speed_kmh:5,line_coordinates:[{lat:42,lon:21},{lat:42,lon:21.01}]}]},area,now);
 assert.equal(data.jams.length,1);assert.equal(trafficFeatures(data).features[0].geometry.type,'Point');assert.equal(trafficFeatures(data).features[1].geometry.type,'LineString');assert.equal(visibleTraffic(data,now+500000).jams.length,1);
});
test('Personal Waze key is encrypted separately and original API Ninjas record still unlocks',async()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(k,v)=>values.set(k,v),removeItem:key=>values.delete(key)},password='Fjalekalim prove 2026!',key='fake-key-for-own-waze-tests-only';
 const ninja=createKeyVault({storage}),waze=createKeyVault({storage,provider:'openwebninja-waze'});await ninja.save('fake-ninjas-key-for-tests-only',password);await waze.save(key,password);assert.equal(values.size,2);assert.ok(!JSON.stringify([...values]).includes(key));
 waze.lock();await assert.rejects(waze.withKey(()=>{}),/Zhblloko/);await waze.unlock(password);assert.equal(await waze.withKey(value=>value===key),true);waze.remove();assert.equal(ninja.status().saved,true);ninja.lock();await ninja.unlock(password);assert.equal(ninja.status().unlocked,true);
 values.set('udhembare-openwebninja-waze-vault-v1',values.get('udhembare-api-ninjas-vault-v1'));await assert.rejects(waze.unlock(password),/nuk përputhet/);
});
test('Only the provider receives key header; no URL key, redirects, retries, cookies or raw provider errors',async()=>{
 const key='fake-personal-waze-key-for-tests';let calls=0;
 const result=await fetchTraffic(area,key,{now,request:async(url,options)=>{calls++;assert.equal(new URL(url).origin,'https://api.openwebninja.com');assert.equal(new URL(url).searchParams.get('bottom_left').split(',').length,2);assert.ok(!url.includes(key));assert.equal(options.headers['x-api-key'],key);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');return Response.json({alerts:[{...alert('a'),street:key}],jams:[]});}});
 assert.equal(calls,1);assert.equal(result.alerts[0].street,'[redacted]');
 await assert.rejects(fetchTraffic(area,key,{request:async()=>new Response(key,{status:403})}),/Kontrollo çelësin/);
 await assert.rejects(fetchTraffic(area,key,{request:async()=>{throw Error(key);}}),error=>!error.message.includes(key));
});
test('Free plan local guard counts failed attempts, blocks rapid refresh and stops at 100 without touching history',()=>{
 const values=new Map([['history','route']]),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 assert.equal(reserveTrafficBudget(storage,now),1);assert.throws(()=>reserveTrafficBudget(storage,now+500),/një minutë/);for(let i=1;i<100;i++)reserveTrafficBudget(storage,now+i*61000);assert.throws(()=>reserveTrafficBudget(storage,now+100*61000),/100 tentativa/);assert.equal(values.get('history'),'route');
 const broken={getItem(){throw Error('no');}};assert.throws(()=>reserveTrafficBudget(broken,now),/ndal/);
});
