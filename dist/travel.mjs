import {point} from './core.mjs?v=3.0';
import {requestJson} from './services.mjs?v=3.0';
const cache=new Map();
export function formatTravel(data){
 if(!Number.isFinite(data.distance)||data.distance<0||!Number.isFinite(data.duration)||data.duration<0)throw Error('Mungon largësia ose koha e udhëtimit.');
 const km=data.distance/1000,minutes=Math.max(1,Math.ceil(data.duration/60)),hours=Math.floor(minutes/60),rest=minutes%60;
 return {distance:km<10?km.toFixed(1)+' km':Math.round(km)+' km',duration:hours?`${hours} h${rest?' '+rest+' min':''}`:`${minutes} min`};
}
export async function stationTravel(origin,target,{signal,request=requestJson,now=Date.now()}={}){
 if(signal?.aborted)throw new DOMException('Anuluar','AbortError');
 origin=point(origin.lat,origin.lon);target=point(target.lat,target.lon);
 const key=[origin.lat.toFixed(5),origin.lon.toFixed(5),target.lat.toFixed(5),target.lon.toFixed(5)].join(',');
 const previous=cache.get(key);if(previous&&now-previous.at<120000)return previous.data;
 const path=`/route/v1/driving/${origin.lon},${origin.lat};${target.lon},${target.lat}?overview=false&steps=false&alternatives=false`;
 for(const base of ['https://router.project-osrm.org','https://routing.openstreetmap.de/routed-car'])try{
  const data=await request(base+path,{signal,timeout:8000}),r=data.routes?.[0];
  if(data.code!=='Ok'||!r)throw Error('Nuk u gjet rrugë automobilistike.');
  formatTravel(r);const result={distance:r.distance,duration:r.duration,checkedAt:new Date(now).toISOString(),source:'OSRM',origin,target};
  if(cache.size>=50)cache.delete(cache.keys().next().value);cache.set(key,{at:now,data:result});return result;
 }catch(error){if(signal?.aborted)throw error;}
 throw Error('Largësia rrugore dhe koha nuk u morën. Provo përsëri ose hape navigimin.');
}
