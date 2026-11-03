import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createApiWorker,ApiQuota,reserveQuota} from '../backend/api-worker.mjs';

const secret='test-only-not-a-real-provider-key';
const origin='https://tosilabs.github.io';
const stamp=Date.UTC(2026,10,3,12,0,0);
const station={name:'Qendra',address:'Rruga 1',latitude:42,longitude:21,is_active:true,connections:[{type_name:'CCS2',level:3,num_connectors:2}]};
function request(query='lat=42&lon=21',extra={}){return new Request('https://worker.example/api/evchargers?'+query,{...extra,headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1',...extra.headers}});}
function fixture(fetcher=async()=>Response.json([station])){
 const calls=[];let reserved=0;
 const env={API_NINJAS_KEY:secret,API_ENABLED:'true',ALLOWED_ORIGINS:origin,API_QUOTA:{idFromName:n=>n,get:()=>({fetch:async()=>{reserved++;return Response.json({allowed:true});}})}};
 const worker=createApiWorker({now:()=>stamp,upstreamFetch:async(...args)=>{calls.push(args);return fetcher(...args);}});
 return {env,worker,calls,get reserved(){return reserved;}};
}
test('Provider key exists only in server header; output is whitelisted, redacted and uncacheable',async()=>{
 const f=fixture(async()=>Response.json([{...station,name:secret,debug:secret,api_key:secret}]));
 const response=await f.worker.fetch(request('lat=42&lon=21&distance=10&level=3',{headers:{Authorization:'Bearer browser-token','X-Api-Key':'client-supplied-value'}}),f.env);
 assert.equal(response.status,200);assert.equal(f.reserved,1);
 const [url,options]=f.calls[0];assert.equal(new URL(url).origin,'https://api.api-ninjas.com');assert.equal(new URL(url).pathname,'/v1/evcharger');
 assert.equal(options.headers['X-Api-Key'],secret);assert.equal(options.headers.Authorization,undefined);assert.equal(options.redirect,'manual');assert.ok(!url.includes(secret));
 const body=await response.text();assert.ok(!body.includes(secret));assert.ok(!body.includes('api_key'));assert.equal(JSON.parse(body).stations[0].name,'[redacted]');
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('CDN-Cache-Control'),'no-store');
});
test('Missing runtime secret, disabled service and failed quota storage all stop before upstream',async()=>{
 for(const patch of [{API_NINJAS_KEY:undefined},{API_ENABLED:'false'},{API_QUOTA:undefined},{API_QUOTA:{idFromName:()=>{throw Error(secret);}}}]){
  const f=fixture();Object.assign(f.env,patch);const response=await f.worker.fetch(request(),f.env);assert.equal(response.status,503);assert.equal(f.calls.length,0);assert.ok(!(await response.text()).includes(secret));
 }
});
test('Only exact configured browser origins and GET are accepted; preflight costs no provider requests',async()=>{
 const f=fixture();
 for(const value of ['https://evil.example','null',origin+'.evil.example',''])assert.equal((await f.worker.fetch(request(undefined,{headers:{Origin:value}}),f.env)).status,403);
 assert.equal((await f.worker.fetch(request(undefined,{method:'POST'}),f.env)).status,405);
 const preflight=await f.worker.fetch(request(undefined,{method:'OPTIONS',headers:{'Access-Control-Request-Method':'GET'}}),f.env);assert.equal(preflight.status,204);
 assert.equal(f.calls.length,0);assert.equal(f.reserved,0);
});
test('Proxy cannot select arbitrary URLs, headers, pagination or malformed/duplicate coordinates',async()=>{
 const f=fixture();
 for(const query of ['lat=42&lon=21&url=https://evil.example','lat=42&lat=43&lon=21','lat=91&lon=21','lat=0x12&lon=21','lat=42&lon=21&distance=51','lat=42&lon=21&distance=NaN','lat=42&lon=21&level=4','lat=42&lon=21&offset=3','lat=42&lon=21&X-Api-Key=anything'])assert.equal((await f.worker.fetch(request(query),f.env)).status,400,query);
 assert.equal(f.calls.length,0);assert.equal(f.reserved,0);
});
test('Provider error text, redirect headers, JSON diagnostics and thrown exceptions cannot leak key',async()=>{
 for(const fetcher of [async()=>new Response(secret,{status:401}),async()=>new Response(null,{status:302,headers:{Location:'https://evil.example/'+secret}}),async()=>Response.json({message:secret}),async()=>{throw Error(secret);},async()=>Response.json([{...station,name:'x'.repeat(110000)}])]){
  const f=fixture(fetcher),response=await f.worker.fetch(request(),f.env);assert.equal(response.status,502);assert.ok(!(await response.text()).includes(secret));assert.equal(response.headers.get('Location'),null);assert.equal(f.calls.length,1,'No quota-consuming retries');
 }
});
test('Quota denial and broken counter binding never invoke provider',async()=>{
 const f=fixture();f.env.API_QUOTA.get=()=>({fetch:async()=>new Response('',{status:429,headers:{'Retry-After':'3600'}})});
 const response=await f.worker.fetch(request(),f.env);assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'3600');assert.equal(f.calls.length,0);
});
test('Persistent quota enforces minute, hour and month limits across bucket resets',()=>{
 const config={CLIENT_PER_MINUTE:'1',HOURLY_BUDGET:'2',MONTHLY_BUDGET:'3'};
 let result=reserveQuota(null,'a',config,stamp);assert.equal(result.allowed,true);
 assert.equal(reserveQuota(result.state,'a',config,stamp+1000).allowed,false);
 result=reserveQuota(result.state,'b',config,stamp+1000);assert.equal(result.allowed,true);
 assert.equal(reserveQuota(result.state,'a',config,stamp+61000).allowed,false,'Hour cap survives minute reset');
 result=reserveQuota(result.state,'a',config,stamp+3600000);assert.equal(result.allowed,true);
 assert.equal(reserveQuota(result.state,'b',config,stamp+7200000).allowed,false,'Monthly cap survives hour reset');
 assert.equal(reserveQuota(result.state,'b',config,Date.UTC(2026,11,1)).allowed,true);
});
test('Concurrent reservations share a transaction, admit only budget and store no GPS/key',async()=>{
 const values=new Map();let queue=Promise.resolve();
 const storage={transaction(fn){const run=queue.then(()=>fn({get:async key=>structuredClone(values.get(key)),put:async(key,value)=>values.set(key,structuredClone(value))}));queue=run.catch(()=>{});return run;}};
 const gate=new ApiQuota({storage},{MONTHLY_BUDGET:'1'});
 const results=await Promise.all(Array.from({length:12},()=>gate.fetch(new Request('https://quota.internal/reserve',{method:'POST',body:JSON.stringify({client:'a'.repeat(64)})}))));
 assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(results.filter(r=>r.status===429).length,11);
 const stored=JSON.stringify([...values]);assert.ok(!stored.includes(secret));assert.ok(!stored.includes('latitude'));assert.ok(!stored.includes('longitude'));assert.equal(values.get('usage').count,1);
});
test('Public Pages tree and offline shell exclude server and local credential files',()=>{
 function scan(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){if(entry.name==='data')continue;assert.ok(!/^(\.env|\.dev\.vars|\.wrangler|backend)(\.|$)/.test(entry.name),'Private asset in dist: '+entry.name);if(entry.isDirectory())scan(dir+'/'+entry.name);}}
 scan(new URL('../dist',import.meta.url).pathname);
 assert.ok(!readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8').includes('api-worker'));
 const config=readFileSync(new URL('../backend/wrangler.toml',import.meta.url),'utf8');assert.ok(!config.includes(secret));assert.ok(!config.includes('API_NINJAS_KEY ='));
});
