import {point,distance,routeProjection} from './core.mjs?v=3.4';
import {requestJson} from './services.mjs?v=3.4';

export function turnInstruction(maneuver,name=''){
 const type=maneuver?.type,modifier=maneuver?.modifier||'',road=String(name||'').slice(0,120);
 let text='Vazhdo drejt',icon='↑';
 const direction=modifier.includes('left')?'majtas':modifier.includes('right')?'djathtas':'';
 if(type==='arrive'){text='Mbërrin në destinacion';icon='⚑';}
 else if(type==='depart'){text='Nisu në rrugë';icon='↑';}
 else if(['roundabout','rotary','roundabout turn'].includes(type)){text='Në rrethrrotullim'+(Number.isInteger(maneuver.exit)&&maneuver.exit>0?`, merr daljen ${maneuver.exit}`:'');icon='⟳';}
 else if(type==='exit roundabout'||type==='exit rotary'){text='Dil nga rrethrrotullimi';icon='↗';}
 else if(modifier==='uturn'){text='Kthehu në drejtimin e kundërt';icon='↶';}
 else if(type==='merge'){text='Bashkohu me rrugën'+(direction?' '+direction:'');icon=direction==='majtas'?'↖':'↗';}
 else if(type==='fork'){text=direction?'Mbaju '+direction:'Vazhdo në degëzim';icon=direction==='majtas'?'↖':'↗';}
 else if(type==='off ramp'){text='Merr daljen'+(direction?' '+direction:'');icon=direction==='majtas'?'↖':'↗';}
 else if(direction){text=(modifier.includes('slight')?'Mbaju ':modifier.includes('sharp')?'Kthehu fort ':'Kthehu ')+direction;icon=direction==='majtas'?'↰':'↱';}
 return {text:road&&type!=='arrive'?text+' · '+road:text,icon};
}
export function navigationRoute(data){
 const route=data?.routes?.[0];
 if(data?.code!=='Ok'||!route||!Number.isFinite(route.distance)||route.distance<=0||!Number.isFinite(route.duration)||route.duration<=0||route.distance>1500000)throw Error('Rruga e navigimit nuk është e vlefshme.');
 if(data.waypoints?.some(w=>!Number.isFinite(w.distance)||w.distance>300))throw Error('Një pikë është tepër larg rrugës automobilistike.');
 const raw=route.legs?.flatMap(leg=>leg.steps||[]);if(!raw?.length)throw Error('Shërbimi nuk ktheu udhëzime kthesash.');
 const line=[],measures=[],turns=[];let km=0;
 for(const step of raw){
  if(!step.maneuver?.type||!Array.isArray(step.geometry?.coordinates)||!step.geometry.coordinates.length)throw Error('Udhëzimet e rrugës janë të paplota.');
  const coords=step.geometry.coordinates.map(c=>point(c[1],c[0]));
  if(line.length&&distance(line.at(-1),coords[0])>.1)throw Error('Segmentet e rrugës nuk përputhen.');
  const atKm=km;
  for(const p of coords){if(line.length){const d=distance(line.at(-1),p);if(d<.000001)continue;km+=d;}line.push(p);measures.push(km);}
  if(step.maneuver.type!=='depart')turns.push({...turnInstruction(step.maneuver,step.name||step.ref),type:step.maneuver.type,atKm,point:coords[0]});
 }
 if(line.length<2||km<=0||line.length>100000||turns.at(-1)?.type!=='arrive')throw Error('Rruga nuk përmban udhëzime të plota deri në mbërritje.');
 return {line,measures,turns,km,distance:route.distance,duration:route.duration};
}
export async function fetchNavigation(points,{signal,request=requestJson}={}){
 if(signal?.aborted)throw signal.reason||new DOMException('Anuluar','AbortError');
 if(points.length<2||points.length>18)throw Error('Zgjidh destinacionin dhe deri në 16 ndalesa.');
 const coords=points.map(p=>{p=point(p.lat,p.lon);return `${p.lon},${p.lat}`;}).join(';');
 for(const host of ['https://router.project-osrm.org','https://routing.openstreetmap.de/routed-car'])try{
  const data=await request(`${host}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true&alternatives=false`,{signal,timeout:12000});
  if(signal?.aborted)throw signal.reason;
  return navigationRoute(data);
 }catch(error){if(signal?.aborted)throw error;}
 throw Error('Navigimi nuk u llogarit. Kontrollo internetin ose përdor Waze.');
}
export function course(a,b){const rad=Math.PI/180,x=Math.sin((b.lon-a.lon)*rad)*Math.cos(b.lat*rad),y=Math.cos(a.lat*rad)*Math.sin(b.lat*rad)-Math.sin(a.lat*rad)*Math.cos(b.lat*rad)*Math.cos((b.lon-a.lon)*rad);return (Math.atan2(x,y)/rad+360)%360;}
export function navigationProgress(route,fix,previous=0){
 let best=null;
 for(let i=1;i<route.line.length;i++){
  if(route.measures[i]<previous-.15||route.measures[i-1]>previous+2)continue;
  const p=routeProjection(fix.point,[route.line[i-1],route.line[i]]),along=route.measures[i-1]+p.alongKm;
  if(!best||p.offsetKm<best.offsetKm-1e-6)best={...p,alongKm:along,segment:i-1};
 }
 best??=routeProjection(fix.point,route.line,route.measures);
 const progress=Math.max(0,Math.min(route.km,best.alongKm));
 const turn=route.turns.find(t=>t.atKm>=progress-.015)||route.turns.at(-1);
 const fraction=Math.max(0,1-progress/route.km);
 return {progress,offset:best.offsetKm,turn,toTurn:Math.max(0,turn.atKm-progress),remainingKm:route.distance/1000*fraction,remainingSeconds:route.duration*fraction,
  arrived:route.km-progress<.08&&distance(fix.point,route.line.at(-1))<.1,
  bearing:Number.isFinite(fix.heading)&&fix.speed>=2?fix.heading:course(route.line[best.segment],route.line[Math.min(best.segment+1,route.line.length-1)])};
}
export function freshNavigationFix(fix,now=Date.now()){return Boolean(fix?.point&&Number.isFinite(fix.at)&&now-fix.at>=-2000&&now-fix.at<=15000&&Number.isFinite(fix.accuracy)&&fix.accuracy<=80);}
export const maneuverDistance=km=>km<1?`${Math.max(0,Math.round(km*1000/10)*10)} m`:`${km.toFixed(1)} km`;
