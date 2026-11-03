import {point} from './core.mjs?v=3.5';
import {requestJson} from './services.mjs?v=3.5';
const engines=['https://router.project-osrm.org','https://routing.openstreetmap.de/routed-car'],cache=new Map();
const coords=points=>points.map(p=>{const q=point(p.lat,p.lon);return `${q.lon},${q.lat}`;}).join(';');
export async function roadRoute(points,{signal,request=requestJson,engine=null,geometry=true}={}){
 if(signal?.aborted)throw signal.reason||new DOMException('Anuluar','AbortError');
 const path=`/route/v1/driving/${coords(points)}?overview=${geometry?'full':'false'}&geometries=geojson&steps=false&alternatives=false`,key=(engine||'auto')+path,old=cache.get(key);
 if(old&&Date.now()-old.at<120000)return old.result;
 for(const host of engine?[engine]:engines)try{
  const data=await request(host+path,{signal,timeout:12000}),r=data.routes?.[0];
  if(data.code!=='Ok'||!r||!Number.isFinite(r.distance)||r.distance<0||!Number.isFinite(r.duration)||r.duration<0||geometry&&(!r.geometry?.coordinates?.length))throw Error('Rruga nuk u mor.');
  if(data.waypoints?.some(w=>!Number.isFinite(w.distance)||w.distance>1000))throw Error('Pika është tepër larg rrugës së llogaritur.');
  const result={distance:r.distance,duration:r.duration,legs:r.legs||[],line:r.geometry?.coordinates.map(c=>point(c[1],c[0]))||null,engine:host};
  if(cache.size>80)cache.delete(cache.keys().next().value);cache.set(key,{result,at:Date.now()});return result;
 }catch(error){if(signal?.aborted)throw error;}
 throw Error('Rruga automobilistike nuk u verifikua. Provo përsëri.');
}
export async function stationDetour(start,station,end,{signal,request=requestJson}={}){
 for(const engine of engines)try{
  const base=await roadRoute([start,end],{signal,request,engine,geometry:false});const via=await roadRoute([start,station,end],{signal,request,engine,geometry:false});
  if(via.distance+100<base.distance||via.duration+30<base.duration)throw Error('Rruga bazë ka ndryshuar.');
  return {extraKm:Math.max(0,(via.distance-base.distance)/1000),extraMinutes:Math.max(0,(via.duration-base.duration)/60),via,base};
 }catch(error){if(signal?.aborted)throw error;}
 throw Error('Devijimi real nuk u llogarit. Largësia anësore nuk është devijim rrugor.');
}
export async function roadMatrix(points,{signal,request=requestJson}={}){
 if(points.length<2||points.length>24)throw Error('Matrica mbështet deri në 24 pika.');
 for(const engine of engines)try{
  const data=await request(`${engine}/table/v1/driving/${coords(points)}?annotations=distance,duration`,{signal,timeout:18000});
  const n=points.length;if(data.code!=='Ok'||![data.distances,data.durations].every(m=>Array.isArray(m)&&m.length===n&&m.every(row=>Array.isArray(row)&&row.length===n)))throw Error('Matrica është e paplotë.');
  if(data.sources?.some(w=>!Number.isFinite(w.distance)||w.distance>1000))throw Error('Një pikë nuk lidhet me rrugën.');
  return {distances:data.distances,durations:data.durations,engine};
 }catch(error){if(signal?.aborted)throw error;}
 throw Error('Distancat rrugore nuk u morën. Nuk mund të vlerësohet arritshmëria.');
}
