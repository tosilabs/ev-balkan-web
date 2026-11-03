import {requestJson,withAbort} from './services.mjs?v=3.5';
let cached=null;
const MAX_AGE=10*60*1000;
export function freshStatus(timestamp,now=Date.now()){
 const age=now-Date.parse(timestamp);return Number.isFinite(age)&&age>=-120000&&age<=MAX_AGE;
}
export function connectorState(c){
 const state=String(c.status||'').toLowerCase().replace(/[\s_-]/g,'');
 if(['offline','faulted','outofservice','inoperative','removed'].includes(state))return {key:'offline',label:'Jashtë shërbimit'};
 if(['charging','occupied','reserved'].includes(state))return {key:'busy',label:state==='reserved'?'I rezervuar':'Në karikim / i zënë'};
 if(c.available===true&&['available',''].includes(state))return {key:'free',label:'I lirë'};
 return {key:'unknown',label:'Status i pakonfirmuar'};
}
export function availabilitySummary(data,now=Date.now()){
 const connectors=Array.isArray(data.connectors)?data.connectors:[],states=connectors.map(connectorState);
 return {fresh:freshStatus(data.generated_at,now),generatedAt:data.generated_at||'',total:connectors.length,available:states.filter(s=>s.key==='free').length,working:states.filter(s=>['free','busy'].includes(s.key)).length,connectors};
}
export async function finesSnapshot({signal,request=requestJson,now=Date.now()}={}){
 if(signal?.aborted)throw signal.reason||new DOMException('Anuluar','AbortError');
 if(!cached||now-cached.attemptedAt>=120000){
  const entry={attemptedAt:now,promise:null};
  entry.promise=Promise.resolve().then(()=>request('https://public.finescharging.com/v1/live.json',{timeout:8000})).then(data=>{
   if(!Array.isArray(data.locations))throw Error('Përgjigje e pavlefshme nga operatori.');
   return data;
  }).catch(error=>{if(cached===entry)cached=null;throw error;});
  cached=entry;
 }
 return withAbort(cached.promise,signal);
}

export async function finesLocation(id,options={}){
 const data=await finesSnapshot(options),location=data.locations.find(l=>String(l.location_id)===String(id));
 if(!location)throw Error('Lokacioni nuk u gjet në përgjigjen e operatorit.');
 return {...location,generated_at:data.generated_at};
}
function liveLabel(value){
 const s=String(value||'').toLowerCase();
 return /ccs.*2|combo 2/.test(s)?'CCS2':/ccs.*1|combo 1/.test(s)?'CCS1':/chademo/.test(s)?'CHAdeMO':/type.?2/.test(s)?'Type 2':/type.?1/.test(s)?'Type 1':String(value||'');
}
const unknown=reason=>({key:'unknown',label:'Status i pakonfirmuar',observedAt:'',reason});
export function assessOperating(station,location,generatedAt,{now=Date.now(),minPower=0}={}){
 if(!station.finesId)return unknown('Burimi nuk ofron status aktual të verifikueshëm.');
 if(!location||!freshStatus(generatedAt,now))return unknown('Mungon një përgjigje aktuale nga operatori.');
 const labels=new Set((station.connections||[]).map(c=>c.label));
 if(!labels.size)return unknown('Lidhësit e lokacionit janë të paspecifikuar.');
 const connectors=(Array.isArray(location.connectors)?location.connectors:[]).filter(c=>(!labels.size||labels.has(liveLabel(c.plug_type)))&&(minPower<=0||(Number.isFinite(c.max_power_kw)&&c.max_power_kw>=minPower)));
 if(!connectors.length)return unknown('Nuk ka status për lidhësit që përputhen me filtrat.');
 const states=connectors.map(connectorState),available=states.filter(s=>s.key==='free').length,working=states.filter(s=>s.key==='free'||s.key==='busy').length;
 if(working)return {key:'working',label:available?'Në punë · ka lidhës të lirë':'Në punë · aktualisht i zënë',observedAt:generatedAt,available,working,total:connectors.length};
 if(states.every(s=>s.key==='offline'))return {key:'offline',label:'Jashtë shërbimit sipas operatorit',observedAt:generatedAt,total:connectors.length};
 return unknown('Operatori nuk konfirmon një lidhës në punë për këta filtra.');
}
export function currentOperating(station,now=Date.now()){
 const state=station.operating;
 return state&&state.key!=='unknown'&&freshStatus(state.observedAt,now)?state:unknown(state?.reason||'Statusi mungon ose është vjetruar.');
}
export async function checkOperating(stations,{signal,minPower=0,request=requestJson}={}){
 let data;
 if(stations.some(s=>s.finesId))try{data=await finesSnapshot({signal,request});}catch(error){if(signal?.aborted)throw error;}
 const byId=new Map((data?.locations||[]).map(l=>[String(l.location_id),l]));
 return stations.map(s=>({...s,operating:assessOperating(s,byId.get(s.finesId),data?.generated_at,{minPower})}));
}
export function workingOnly(stations){return stations.filter(s=>currentOperating(s).key==='working');}
