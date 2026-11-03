import {regionalRegistry} from './registry.mjs?v=3.5';
import {cacheSearch,cachedSearch} from './offline.mjs?v=3.5';
const abortError=()=>new DOMException('Kërkimi u anulua.','AbortError');
export async function requestJson(url,{signal,method='GET',body,headers={},timeout=10000}={}){
  const controller=new AbortController(),abort=()=>controller.abort(signal?.reason??abortError());
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  const timer=setTimeout(()=>controller.abort(new DOMException('Shërbimi vonoi përgjigjen.','TimeoutError')),timeout);
  try{const response=await fetch(url,{signal:controller.signal,method,body,headers});
    if(!response.ok)throw Error(response.status===429?'Shërbimi është i ngarkuar.':`Shërbimi ktheu gabimin ${response.status}.`);
    return await response.json();
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export function containsBounds(outer,inner){return Array.isArray(outer)&&outer.length===4&&outer.every(Number.isFinite)&&inner[0]>=outer[0]&&inner[1]>=outer[1]&&inner[2]<=outer[2]&&inner[3]<=outer[3];}
export async function loadCharging(box,signal,{request=requestJson}={}){
  if(signal?.aborted)throw signal.reason||new DOMException('Anuluar','AbortError');
  if(request===requestJson&&globalThis.navigator?.onLine===false){const saved=await cachedSearch(box);if(signal?.aborted)throw signal.reason||new DOMException('Anuluar','AbortError');if(saved)return saved;}
  if(request===requestJson)try{const data=await regionalRegistry(box,{signal,request});void cacheSearch(box,data);return data;}catch(error){if(signal?.aborted)throw error;}
  try{
    const data=await request(new URL('./data/charging-balkans.json',import.meta.url).href,{signal,timeout:12000});
    if(Array.isArray(data.elements)&&data.elements.length>0&&containsBounds(data.bounds,box)&&data.fetchedAt){
      // Keep only records in the requested box before expensive corridor calculations.
      const elements=data.elements.filter(e=>{const p=e.center??e;return p.lat>=box[0]&&p.lon>=box[1]&&p.lat<=box[2]&&p.lon<=box[3];});
      const result={elements,fetchedAt:data.fetchedAt,cached:true};if(request===requestJson)void cacheSearch(box,result);return result;
    }
  }catch(error){if(signal?.aborted)throw error;}
  const query=`[out:json][timeout:12][maxsize:16777216];nwr["amenity"="charging_station"](${box.join(',')});out tags center;`;
  let lastError;
  for(const endpoint of ['https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter']){
    try{const data=await request(`${endpoint}?data=${encodeURIComponent(query)}`,{signal,timeout:16000});
      if(data.remark||!Array.isArray(data.elements))throw Error('Burimi nuk e përfundoi kërkimin. Provo rreze më të vogël.');
      return data;
    }catch(error){if(signal?.aborted)throw error;lastError=error;}
  }
  if(request===requestJson){const old=await cachedSearch(box);if(old)return old;}
  throw Error('Regjistri i karikuesve nuk u ngarkua. Kontrollo internetin dhe rifresko faqen. '+(lastError?.name==='TimeoutError'?'Shërbimet rezervë vonuan përgjigjen.':''));
}

// Cancellation belongs to a caller, while a shared provider request may serve other screens.
export function withAbort(promise,signal){
 if(!signal)return promise;
 if(signal.aborted)return Promise.reject(signal.reason||new DOMException('Anuluar','AbortError'));
 return new Promise((resolve,reject)=>{
  const abort=()=>{cleanup();reject(signal.reason||new DOMException('Anuluar','AbortError'));};
  const cleanup=()=>signal.removeEventListener('abort',abort);
  signal.addEventListener('abort',abort,{once:true});
  promise.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
 });
}
