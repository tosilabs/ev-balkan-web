import {distance,point} from './core.mjs?v=1.7';
import {requestJson} from './services.mjs?v=1.7';
export const TERRAIN={high:{color:'#c34839',label:'Ngjitje · konsum më i lartë'},up:{color:'#d38b24',label:'Ngjitje e lehtë · konsum më i lartë'},level:{color:'#298264',label:'Pothuajse rrafsh · ndikim i vogël'},down:{color:'#347db0',label:'Zbritje · konsum më i ulët / rigjenerim i mundshëm'},unknown:{color:'#7f8790',label:'Pa të dhëna lartësie'}};
export function lineDistances(line){
 if(!Array.isArray(line)||line.length<2)throw Error('Itinerari nuk ka pika të mjaftueshme.');
 const km=[0];for(let i=1;i<line.length;i++)km.push(km[i-1]+distance(line[i-1],line[i]));return km;
}
function at(line,km,target){
 let lo=0,hi=km.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(km[mid]<=target)lo=mid;else hi=mid;}
 const d=km[lo+1]-km[lo],t=d?Math.max(0,Math.min(1,(target-km[lo])/d)):0;
 return {...point(line[lo].lat+(line[lo+1].lat-line[lo].lat)*t,line[lo].lon+(line[lo+1].lon-line[lo].lon)*t),km:target,index:lo};
}
export function sampleRoute(line,{spacingKm=.35,maxPoints=400}={}){
 const km=lineDistances(line),total=km.at(-1);if(total<.005)throw Error('Itinerari është tepër i shkurtër për profil.');
 const count=Math.min(Math.max(2,maxPoints),Math.max(2,Math.ceil(total/spacingKm)+1));
 return Array.from({length:count},(_,i)=>at(line,km,total*i/(count-1)));
}
export function terrainClass(grade){return !Number.isFinite(grade)?'unknown':grade>=4?'high':grade>=1.5?'up':grade<=-1.5?'down':'level';}
export function makeProfile(samples,elevations,metadata={}){
 if(samples.length!==elevations.length||samples.length<2)throw Error('Mungojnë të dhënat e profilit.');
 const valid=z=>typeof z==='number'&&Number.isFinite(z)&&z>=-500&&z<=9000;
 const raw=elevations.map(z=>valid(z)?z:null);
 // A median of three adjacent valid samples reduces isolated DEM spikes; gaps remain gaps.
 const heights=metadata.smoothed?raw:raw.map((z,i)=>z===null?null:i>0&&i<raw.length-1&&raw[i-1]!==null&&raw[i+1]!==null?[raw[i-1],z,raw[i+1]].sort((a,b)=>a-b)[1]:z);
 const points=samples.map((p,i)=>({lat:p.lat,lon:p.lon,km:p.km,elevation:heights[i]})),segments=[];
 let ascent=0,descent=0,coveredKm=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],km=b.km-a.km,known=a.elevation!==null&&b.elevation!==null&&km>0;
  const delta=known?b.elevation-a.elevation:null,grade=known?delta/(km*10):null,key=terrainClass(grade);
  if(known){coveredKm+=km;if(delta>=3)ascent+=delta;else if(delta<=-3)descent-=delta;}
  segments.push({key,grade,km,startKm:a.km,endKm:b.km,index:i-1});
 }
 const zs=points.map(p=>p.elevation).filter(z=>z!==null),km=points.at(-1).km;
 return {points,segments,km,ascent,descent,min:zs.length?Math.min(...zs):null,max:zs.length?Math.max(...zs):null,coverage:km?coveredKm/km:0,spacingKm:km/(points.length-1),smoothed:true,...metadata};
}
export function coloredPieces(line,profile){
 const km=lineDistances(line),scale=km.at(-1)/profile.km;
 return profile.segments.map(s=>{
  const a=at(line,km,s.startKm*scale),b=at(line,km,s.endKm*scale);
  return {...s,line:[a,...line.slice(a.index+1,b.index+1),b]};
 });
}
const delay=(ms,signal)=>new Promise((resolve,reject)=>{
 const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(new DOMException('Anuluar','AbortError'));};
 const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
});
export async function loadTerrain(line,{signal,request=requestJson,sleep=delay}={}){
 const samples=sampleRoute(line),zs=Array(samples.length).fill(null),sources=new Set();let primaryDown=false,fallbackDown=false,lastFallback=0;
 for(let offset=0;offset<samples.length;offset+=100){
  if(signal?.aborted)throw new DOMException('Anuluar','AbortError');
  const batch=samples.slice(offset,offset+100);let values=null;
  if(!primaryDown)try{
   const data=await request(`https://api.open-meteo.com/v1/elevation?latitude=${batch.map(p=>p.lat.toFixed(5)).join(',')}&longitude=${batch.map(p=>p.lon.toFixed(5)).join(',')}`,{signal,timeout:6500});
   if(!Array.isArray(data.elevation)||data.elevation.length!==batch.length)throw Error('Përgjigje e paplotë e lartësisë.');
   values=data.elevation;sources.add('open-meteo');
  }catch(error){if(signal?.aborted)throw error;primaryDown=true;}
  if(!values&&!fallbackDown)try{
   const elapsed=Date.now()-lastFallback;if(elapsed<1100)await sleep(1100-elapsed,signal);lastFallback=Date.now();
   const data=await request('https://api.opentopodata.org/v1/srtm90m?locations='+batch.map(p=>`${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join('|'),{signal,timeout:6500});
   if(data.status!=='OK'||!Array.isArray(data.results)||data.results.length!==batch.length)throw Error('Burimi rezervë nuk ka profil.');
   values=data.results.map(r=>r.elevation);sources.add('opentopodata');
  }catch(error){if(signal?.aborted)throw error;fallbackDown=true;}
  if(values)values.forEach((z,i)=>{zs[offset+i]=z;});
  if(primaryDown&&fallbackDown)break;
 }
 return makeProfile(samples,zs,{fetchedAt:new Date().toISOString(),sources:[...sources]});
}
