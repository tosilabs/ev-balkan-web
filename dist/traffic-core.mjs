import {point,bounds,distance,routeProjection} from './core.mjs?v=3.5';

export const TRAFFIC_PROVIDER='openwebninja-waze';
export const TRAFFIC_TTL=10*60000;
const routeCache=new WeakMap();
function routeMatch(line){if(!routeCache.has(line)){const measures=[0];for(let i=1;i<line.length;i++)measures.push(measures[i-1]+distance(line[i-1],line[i]));routeCache.set(line,{measures,alerts:new WeakMap()});}return routeCache.get(line);}
export const TRAFFIC_TYPES={POLICE:{label:'Polici e raportuar',letter:'P',color:'#2767cc'},ACCIDENT:{label:'Aksident',letter:'!',color:'#c74637'},HAZARD:{label:'Pengesë / rrezik',letter:'!',color:'#b16c12'},ROAD_CLOSED:{label:'Rrugë e mbyllur',letter:'×',color:'#9b3342'}};

export function trafficArea({mode='near',center,line=null}){
 center=point(center.lat,center.lon);
 if(mode==='route'){
  if(!Array.isArray(line)||line.length<2)throw Error('Krijo një itinerar për raportimet përgjatë rrugës.');
  const cumulative=[0];for(let i=1;i<line.length;i++)cumulative.push(cumulative[i-1]+distance(line[i-1],line[i]));
  const projected=routeProjection(center,line,cumulative),at=projected.offsetKm>5?{alongKm:0,segment:0,nearest:line[0]}:projected,end=Math.min(cumulative.at(-1),at.alongKm+20),part=[at.nearest];
  for(let i=at.segment+1;i<line.length;i++){
   if(cumulative[i]<=end){part.push(line[i]);continue;}
   const a=line[i-1],b=line[i],fraction=(end-cumulative[i-1])/(cumulative[i]-cumulative[i-1]||1);part.push({lat:a.lat+(b.lat-a.lat)*fraction,lon:a.lon+(b.lon-a.lon)*fraction});break;
  }
  return {box:bounds(part,1),line:part,mode,label:projected.offsetKm>5?'Deri në 20 km nga nisja · korridor 1 km':'Deri në 20 km përpara · korridor 1 km'};
 }
 return {box:bounds([center],10),line:null,mode:'near',label:'Rreth pikës së zgjedhur · 10 km'};
}
function inArea(p,area){const [s,w,n,e]=area.box;return p.lat>=s&&p.lat<=n&&p.lon>=w&&p.lon<=e&&(!area.line||routeProjection(p,area.line).offsetKm<=1);}
export function parseTraffic(payload,area,now=Date.now()){
 const data=payload?.data??payload;
 if(!data||!Array.isArray(data.alerts)||!Array.isArray(data.jams))throw Error('Ofruesi nuk ktheu formatin e pritshëm të raportimeve.');
 const alerts=[],jams=[],seen=new Set();
 for(const raw of data.alerts.slice(0,2000)){
  if(!raw||!TRAFFIC_TYPES[raw.type]||typeof raw.alert_id!=='string'||seen.has(raw.alert_id))continue;
  let p;try{p=point(raw.latitude,raw.longitude);}catch{continue;}
  const at=Date.parse(raw.publish_datetime_utc),age=now-at,maxAge=raw.type==='POLICE'?3600000:7200000;
  if(!Number.isFinite(at)||age< -300000||age>maxAge||!inArea(p,area))continue;
  seen.add(raw.alert_id);alerts.push({id:raw.alert_id.slice(0,180),type:raw.type,point:p,at,street:String(raw.street||raw.city||'').slice(0,160),reliability:Number.isFinite(raw.alert_reliability)&&raw.alert_reliability>=0&&raw.alert_reliability<=10?raw.alert_reliability:null,...TRAFFIC_TYPES[raw.type]});
 }
 for(const raw of data.jams.slice(0,800)){
  if(!raw||typeof raw.jam_id!=='string'||seen.has('jam:'+raw.jam_id)||!Array.isArray(raw.line_coordinates))continue;
  const at=Date.parse(raw.update_datetime_utc),age=now-at;if(!Number.isFinite(at)||age< -300000||age>900000)continue;
  const line=raw.line_coordinates.slice(0,1000).flatMap(c=>{try{return [point(c.lat,c.lon)];}catch{return [];}});
  if(line.length<2||!line.some(p=>inArea(p,area)))continue;
  seen.add('jam:'+raw.jam_id);jams.push({id:raw.jam_id.slice(0,180),line,at,level:Number.isInteger(raw.level)?Math.max(0,Math.min(5,raw.level)):0,speed:Number.isFinite(raw.speed_kmh)&&raw.speed_kmh>=0?raw.speed_kmh:null});
 }
 return {alerts:alerts.slice(0,200),jams:jams.slice(0,100),fetchedAt:now,area};
}
export function trafficFeatures(data){return {type:'FeatureCollection',features:data?[...data.alerts.map(a=>({type:'Feature',geometry:{type:'Point',coordinates:[a.point.lon,a.point.lat]},properties:{label:a.letter,color:a.color,id:a.id}})),...data.jams.map(j=>({type:'Feature',geometry:{type:'LineString',coordinates:j.line.map(p=>[p.lon,p.lat])},properties:{color:j.level>=4?'#c74637':'#d68016',id:j.id}}))]:[]};}
export function visibleTraffic(data,now=Date.now()){
 if(!data||now-data.fetchedAt>TRAFFIC_TTL||now<data.fetchedAt-300000)return null;
 return {...data,alerts:data.alerts.filter(a=>now-a.at<=(a.type==='POLICE'?3600000:7200000)),jams:data.jams.filter(j=>now-j.at<=900000)};
}
export function nearestTraffic(data,fix,line=null){
 if(!data||!fix||Date.now()-fix.at>30000)return null;
 const match=line?.length?routeMatch(line):null,projection=match?routeProjection(fix.point,line,match.measures):null;
 return data.alerts.flatMap(alert=>{
  const km=distance(fix.point,alert.point);if(km>10)return [];
  if(projection&&projection.offsetKm<1){let onRoute=match.alerts.get(alert);if(!onRoute){onRoute=routeProjection(alert.point,line,match.measures);match.alerts.set(alert,onRoute);}if(onRoute.offsetKm>1||onRoute.alongKm<projection.alongKm-.1)return [];return [{...alert,km:Math.max(0,onRoute.alongKm-projection.alongKm),along:true}];}
  return [{...alert,km,along:false}];
 }).sort((a,b)=>a.km-b.km)[0]||null;
}
export function reserveTrafficBudget(storage,now=Date.now()){
 const key='udhembare-waze-usage-v1',month=new Date(now).toISOString().slice(0,7);let state;
 try{const raw=storage.getItem(key);state=raw?JSON.parse(raw):null;}catch{throw Error('Numëruesi lokal nuk lexohet. Kërkesa u ndal.');}
 if(!state||state.month!==month)state={month,count:0,lastAt:0};
 if(!Number.isInteger(state.count)||state.count<0||!Number.isFinite(state.lastAt))throw Error('Numëruesi lokal është i pavlefshëm.');
 if(state.count>=100)throw Error('Ky shfletues ka arritur 100 tentativa këtë muaj. Kontrollo kuotën te ofruesi.');
 if(now-state.lastAt<60000)throw Error('Prit një minutë para kërkesës tjetër.');
 try{storage.setItem(key,JSON.stringify({...state,count:state.count+1,lastAt:now}));}catch{throw Error('Numëruesi lokal nuk u ruajt. Kërkesa u ndal.');}
 return state.count+1;
}
export async function fetchTraffic(area,key,{signal,request=fetch,now=Date.now()}={}){
 if(signal?.aborted)throw new DOMException('Kërkesa u anulua.','AbortError');
 const [s,w,n,e]=area.box,url=new URL('https://api.openwebninja.com/waze/alerts-and-jams');
 url.searchParams.set('bottom_left',`${s.toFixed(5)},${w.toFixed(5)}`);url.searchParams.set('top_right',`${n.toFixed(5)},${e.toFixed(5)}`);url.searchParams.set('max_alerts','200');url.searchParams.set('max_jams','100');
 let response;try{response=await request(url.href,{method:'GET',headers:{'x-api-key':key},signal,redirect:'error',cache:'no-store',credentials:'omit'});}catch{throw Error('Ofruesi nuk u arrit. Kontrollo rrjetin; nëse CORS bllokohet, nevojitet ndërmjetësi yt në server.');}
 if(!response.ok)throw Error(response.status===401||response.status===403?'Kontrollo çelësin dhe abonimin Waze te OpenWeb Ninja.':response.status===429?'Ofruesi raporton kufirin e kuotës. Provo më vonë.':'Ofruesi nuk e përfundoi kërkimin e raportimeve.');
 const reader=response.body?.getReader();if(!reader)throw Error('Përgjigjja e ofruesit është bosh.');let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2000000)throw Error('Përgjigjja është tepër e madhe për këtë pamje.');chunks.push(value);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
 let payload;try{payload=JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('Ofruesi nuk ktheu të dhëna JSON të vlefshme.');}
 const result=parseTraffic(payload,area,now);for(const alert of result.alerts){alert.id=alert.id.replaceAll(key,'[redacted]');alert.street=alert.street.replaceAll(key,'[redacted]');}return result;
}
