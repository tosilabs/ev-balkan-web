import {point,settings} from './core.mjs?v=1.9';
import {makeProfile} from './terrain.mjs?v=1.9';
const MODES=['near','place','route'];
const trim=x=>typeof x==='string'?x.slice(0,300):'';
// Ramer-Douglas-Peucker retains turns. Increase tolerance only for unusually detailed routes.
export function compactLine(line,max=2000){
 const points=line.map(p=>point(Number(p.lat.toFixed(6)),Number(p.lon.toFixed(6))));if(points.length<=max)return points;
 function simplify(tolerance){
  const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]];
  while(stack.length){const [a,b]=stack.pop(),p=points[a],q=points[b],scale=Math.cos(p.lat*Math.PI/180);let best=tolerance,index=-1;
   const dx=(q.lon-p.lon)*scale,dy=q.lat-p.lat,den=dx*dx+dy*dy;
   for(let i=a+1;i<b;i++){const x=(points[i].lon-p.lon)*scale,y=points[i].lat-p.lat,t=den?Math.max(0,Math.min(1,(x*dx+y*dy)/den)):0,d=Math.hypot(x-t*dx,y-t*dy)*111;
    if(d>best){best=d;index=i;}}
   if(index>=0){keep.add(index);stack.push([a,index],[index,b]);}
  }
  return [...keep].sort((a,b)=>a-b).map(i=>points[i]);
 }
 let tolerance=.02,result=simplify(tolerance);while(result.length>max){tolerance*=1.5;result=simplify(tolerance);}return result;
}
export function cleanHistoryEntry(raw){
 try{
  if(!raw||!MODES.includes(raw.mode))return null;
  const center=point(raw.center?.lat,raw.center?.lon),start=raw.mode==='route'?point(raw.start?.lat,raw.start?.lon):null;
  const line=raw.mode==='route'&&Array.isArray(raw.line)&&raw.line.length>=2&&raw.line.length<=200000?compactLine(raw.line.map(p=>point(p.lat,p.lon))):null;
  if(raw.mode==='route'&&(!line||!Number.isFinite(raw.routeKm)||raw.routeKm<=0||raw.routeKm>1500))return null;
  let terrain=null;
  if(line&&Array.isArray(raw.terrain?.points)&&raw.terrain.points.length>=2&&raw.terrain.points.length<=400){
   const samples=raw.terrain.points.map(p=>({...point(p.lat,p.lon),km:p.km}));
   if(samples.every((p,i)=>Number.isFinite(p.km)&&p.km>=0&&p.km<=1600&&(!i?p.km===0:p.km>samples[i-1].km))){
    terrain=makeProfile(samples,raw.terrain.points.map(p=>p.elevation),{sources:(raw.terrain.sources||[]).filter(s=>['open-meteo','opentopodata'].includes(s)),fetchedAt:trim(raw.terrain.fetchedAt),smoothed:true});
   }
  }
  return {id:typeof raw.id==='string'&&/^h[a-z0-9-]{3,80}$/.test(raw.id)?raw.id:'h'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),mode:raw.mode,query:trim(raw.query),origin:trim(raw.origin),center,start,line,routeKm:line?raw.routeKm:null,routeDuration:line&&Number.isFinite(raw.routeDuration)&&raw.routeDuration>0&&raw.routeDuration<7*86400?raw.routeDuration:null,options:settings(raw.options),terrain,at:Number.isFinite(raw.at)?raw.at:Date.now()};
 }catch{return null;}
}
export function cleanHistory(raw){return (Array.isArray(raw)?raw:[]).slice(0,30).map(cleanHistoryEntry).filter(Boolean);}
function fingerprint(e){const p=x=>x?`${x.lat.toFixed(4)},${x.lon.toFixed(4)}`:'';return [e.mode,p(e.center),p(e.start),JSON.stringify(e.options)].join('|');}
export function addHistory(history,raw){
 const entry=cleanHistoryEntry({...raw,at:Date.now()});if(!entry)return cleanHistory(history);
 return [entry,...cleanHistory(history).filter(e=>fingerprint(e)!==fingerprint(entry))].slice(0,30);
}
export function historyLabel(entry){
 const p=x=>`${x.lat.toFixed(4)}, ${x.lon.toFixed(4)}`;
 return entry.mode==='route'?`${entry.origin||p(entry.start)} → ${entry.query||p(entry.center)}`:entry.mode==='near'?`Pranë vendit: ${p(entry.center)}`:entry.query||p(entry.center);
}

export function encodeHistory(history){return JSON.stringify(history.map(e=>({...e,terrain:e.terrain?{points:e.terrain.points,sources:e.terrain.sources,fetchedAt:e.terrain.fetchedAt}:null})));}
