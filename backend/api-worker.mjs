// Server code only: never copy this directory into dist/.
const UPSTREAM='https://api.api-ninjas.com/v1/evcharger';
const ROUTE='/api/evchargers';
const RESPONSE_LIMIT=100000;

function json(body,status=200,origin=null,extra={}){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...extra};
 if(origin)headers['Access-Control-Allow-Origin']=origin;
 return new Response(JSON.stringify(body),{status,headers});
}
function queryFor(url){
 const params=url.searchParams,allowed=new Set(['lat','lon','distance','level']);
 for(const key of params.keys())if(!allowed.has(key)||params.getAll(key).length!==1)throw Error('query');
 const coordinate=(name,min,max)=>{const raw=params.get(name);if(!raw||!/^[-+]?\d{1,3}(?:\.\d{1,8})?$/.test(raw))throw Error('coordinate');const n=Number(raw);if(n<min||n>max)throw Error('coordinate');return String(n);};
 const upstream=new URL(UPSTREAM);
 upstream.searchParams.set('lat',coordinate('lat',-90,90));upstream.searchParams.set('lon',coordinate('lon',-180,180));
 const raw=params.get('distance')??'10';
 if(!/^\d{1,2}(?:\.\d{1,2})?$/.test(raw)||Number(raw)<.3||Number(raw)>50)throw Error('distance');
 upstream.searchParams.set('distance',String(Number(raw)));
 if(params.has('level')){const level=params.get('level');if(!['1','2','3'].includes(level))throw Error('level');upstream.searchParams.set('level',level);}
 return upstream;
}
function sanitize(data,secret){
 if(!Array.isArray(data)||data.length>30)throw Error('shape');
 const text=value=>typeof value==='string'?value.replaceAll(secret,'[redacted]').slice(0,300):'';
 return data.flatMap(row=>{
  if(!row||typeof row!=='object'||!Number.isFinite(row.latitude)||Math.abs(row.latitude)>90||!Number.isFinite(row.longitude)||Math.abs(row.longitude)>180)return [];
  const connections=(Array.isArray(row.connections)?row.connections:[]).slice(0,30).filter(c=>c&&typeof c==='object').map(c=>({type_name:text(c.type_name),type_official:text(c.type_official),level:[1,2,3].includes(c.level)?c.level:null,num_connectors:Number.isInteger(c.num_connectors)&&c.num_connectors>0&&c.num_connectors<=1000?c.num_connectors:null}));
  return [{name:text(row.name),address:text(row.address),city:text(row.city),region:text(row.region),country:text(row.country),latitude:row.latitude,longitude:row.longitude,is_active:typeof row.is_active==='boolean'?row.is_active:null,connections}];
 });
}
async function limitedJson(response){
 if(!response.headers.get('content-type')?.toLowerCase().includes('application/json'))throw Error('type');
 const reader=response.body?.getReader();if(!reader)throw Error('body');
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>RESPONSE_LIMIT)throw Error('size');chunks.push(value);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
 return JSON.parse(new TextDecoder().decode(bytes));
}

export function createApiWorker({upstreamFetch=fetch,now=Date.now}={}){
 return {async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname!==ROUTE)return json({error:'Nuk u gjet.'},404);
  const origin=request.headers.get('Origin');
  const allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(s=>/^https:\/\/[^/]+$/.test(s));
  if(!origin||!allowed.includes(origin))return json({error:'Kërkesa nuk lejohet.'},403);
  if(request.method==='OPTIONS'){
   if(request.headers.get('Access-Control-Request-Method')!=='GET'||request.headers.get('Access-Control-Request-Headers'))return json({error:'Kërkesa nuk lejohet.'},403,origin);
   return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET','Vary':'Origin','Cache-Control':'no-store'}});
  }
  if(request.method!=='GET')return json({error:'Lejohet vetëm kërkimi.'},405,origin,{Allow:'GET, OPTIONS'});
  let upstream;
  try{upstream=queryFor(url);}catch{return json({error:'Përdor koordinata të vlefshme, largësi 0.3–50 km dhe level 1/2/3.'},400,origin);}
  const secret=env.API_NINJAS_KEY;
  if(env.API_ENABLED!=='true'||typeof secret!=='string'||secret.length<16||!env.API_QUOTA)return json({error:'Burimi shtesë nuk është aktivizuar.'},503,origin);
  // Cloudflare overwrites this header at its edge; no X-Forwarded-For fallback.
  const ip=request.headers.get('CF-Connecting-IP');if(!ip)return json({error:'Kërkesa nuk u verifikua.'},503,origin);
  try{
   const minute=Math.floor(now()/60000);
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${minute}:${ip}`));
   const client=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
   const gate=env.API_QUOTA.get(env.API_QUOTA.idFromName('api-ninjas-v1'));
   const quota=await gate.fetch('https://quota.internal/reserve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client})});
   if(quota.status===429)return json({error:'U arrit kufiri i kërkesave. Provo më vonë.'},429,origin,{'Retry-After':quota.headers.get('Retry-After')||'60'});
   if(!quota.ok)return json({error:'Burimi shtesë përkohësisht nuk është i disponueshëm.'},503,origin);
  }catch{return json({error:'Burimi shtesë përkohësisht nuk është i disponueshëm.'},503,origin);}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
   // Fixed URL, no user headers, no redirects, no automatic retries, no result cache.
   const response=await upstreamFetch(upstream.href,{method:'GET',headers:{'X-Api-Key':secret,Accept:'application/json'},redirect:'manual',signal:controller.signal});
   if(!response.ok){await response.body?.cancel().catch(()=>{});return json({error:'Ofruesi nuk e përfundoi kërkimin. Provo më vonë.'},response.status===429?503:502,origin);}
   const stations=sanitize(await limitedJson(response),secret);
   return json({source:'API Ninjas',fetchedAt:new Date(now()).toISOString(),stations},200,origin);
  }catch{return json({error:'Burimi shtesë nuk u përgjigj. Provo më vonë.'},502,origin);}
  finally{clearTimeout(timer);}
 }};
}

function limit(value,fallback,max){const n=Number(value);return Number.isInteger(n)&&n>0&&n<=max?n:fallback;}
export function reserveQuota(previous,client,env,now=Date.now()){
 const date=new Date(now),month=date.toISOString().slice(0,7),hour=Math.floor(now/3600000),minute=Math.floor(now/60000);
 const state=previous?.month===month?structuredClone(previous):{month,count:0,hour,hourCount:0,minute,clients:{}};
 if(state.hour!==hour){state.hour=hour;state.hourCount=0;}
 if(state.minute!==minute){state.minute=minute;state.clients={};}
 const monthMax=limit(env.MONTHLY_BUDGET,2000,10000000),hourMax=limit(env.HOURLY_BUDGET,60,100000),ipMax=limit(env.CLIENT_PER_MINUTE,6,100);
 if(state.count>=monthMax)return {allowed:false,retry:Math.ceil((Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1)-now)/1000)};
 if(state.hourCount>=hourMax)return {allowed:false,retry:Math.ceil(((hour+1)*3600000-now)/1000)};
 if((state.clients[client]||0)>=ipMax)return {allowed:false,retry:Math.ceil(((minute+1)*60000-now)/1000)};
 state.count++;state.hourCount++;state.clients[client]=(state.clients[client]||0)+1;
 return {allowed:true,state};
}

// A single Durable Object makes the quota global across edge locations/restarts.
// Only counters and short-lived IP hashes are stored, never keys or station data.
export class ApiQuota{
 constructor(state,env){this.storage=state.storage;this.env=env;}
 async fetch(request){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/reserve')return json({error:'Nuk u gjet.'},404);
  let client;try{({client}=await request.json());}catch{return json({error:'Kërkesë e pavlefshme.'},400);}
  if(!/^[a-f0-9]{64}$/.test(client))return json({error:'Kërkesë e pavlefshme.'},400);
  const result=await this.storage.transaction(async txn=>{
   const result=reserveQuota(await txn.get('usage'),client,this.env);
   if(result.allowed)await txn.put('usage',result.state);
   return result;
  });
  return result.allowed?json({allowed:true}):json({allowed:false},429,null,{'Retry-After':String(result.retry)});
 }
}
export default createApiWorker();
