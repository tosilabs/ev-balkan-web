import {compatiblePower,energyForKm,chargingMinutes,parseTariff,sessionCost,terrainBetween,weatherBetween} from './energy.mjs?v=3.6';
export function planningCandidates(stations,p,{limit=16,excluded=[],isOffline=()=>false}={}){
 const usable=stations.filter(s=>!excluded.includes(s.id)&&!isOffline(s)&&Number.isFinite(s.routePosition)&&compatiblePower(s,p)).sort((a,b)=>a.routePosition-b.routePosition);
 if(usable.length<=limit)return usable;
 const bins=Array.from({length:limit},()=>[]),total=Math.max(1,usable.at(-1).routePosition);
 for(const s of usable)bins[Math.min(limit-1,Math.floor(s.routePosition/total*limit))].push(s);
 const chosen=bins.filter(b=>b.length).map(b=>b.sort((a,b)=>compatiblePower(b,p).power-compatiblePower(a,p).power||a.routeOffset-b.routeOffset)[0]);
 for(const s of usable)if(chosen.length<limit&&!chosen.includes(s))chosen.push(s);
 return chosen.sort((a,b)=>a.routePosition-b.routePosition);
}
export function optimizeJourney({profile:p,stations,matrix,routeKm,terrain=null,weather=[],mode='time',budget=null}){
 if(!['time','cost','reserve'].includes(mode))throw Error('Mënyra e planifikimit nuk është e vlefshme.');
 if(p.soc<p.reserve)throw Error('Bateria aktuale është nën rezervën e zgjedhur. Ul rezervën vetëm nëse e ke vlerësuar vetë situatën.');
 const nodes=[null,...stations,null],n=nodes.length;if(![matrix.distances,matrix.durations].every(m=>Array.isArray(m)&&m.length===n&&m.every(row=>Array.isArray(row)&&row.length===n)))throw Error('Mungon matrica rrugore.');
 const tariffs=stations.map(s=>parseTariff(s.price)),currencies=[...new Set(tariffs.filter(t=>t?.complete).map(t=>t.currency))];
 if((mode==='cost'||budget!==null)&&currencies.length>1)throw Error('Tarifat kanë valuta të ndryshme. Zgjidh planifikimin sipas kohës.');
 const progress=i=>i===0?0:i===n-1?routeKm:stations[i-1].routePosition;
 const labels=Array.from({length:n},()=>[]);labels[0]=[{soc:p.soc,minutes:0,cost:0,costKnown:true,currency:null,distance:0,energy:0,stops:[],path:[0]}];let best=null;
 const score=x=>mode==='cost'?x.costKnown?x.cost:Infinity:mode==='reserve'?x.minutes+Math.max(0,30-x.soc)*3:x.minutes;
 const push=(index,label)=>{const list=labels[index];if(list.some(x=>x.soc+1e-9>=label.soc&&x.minutes<=label.minutes&&(!label.costKnown||x.costKnown&&x.currency===label.currency&&x.cost<=label.cost)))return;list.push(label);list.sort((a,b)=>score(a)-score(b));if(list.length>240)list.length=240;};
 for(let i=0;i<n-1;i++)for(const current of [...labels[i]])for(let j=i+1;j<n;j++){
  const meters=matrix.distances[i]?.[j],seconds=matrix.durations[i]?.[j];if(!Number.isFinite(meters)||meters<0||!Number.isFinite(seconds)||seconds<0)continue;
  const extra=terrainBetween(terrain,progress(i),progress(j)),used=energyForKm(meters/1000,p,{...extra,temperature:p.temperature??weatherBetween(weather,progress(i),progress(j))}),arrival=current.soc-used/p.capacity*100;
  if(arrival+1e-8<p.reserve)continue;
  const common={...current,soc:arrival,minutes:current.minutes+seconds/60,distance:current.distance+meters/1000,energy:current.energy+used,path:[...current.path,j]};
  if(j===n-1){if(mode==='cost'&&!common.costKnown)continue;if(!best||score(common)<score(best))best=common;continue;}
  const station=stations[j-1],connection=compatiblePower(station,p),tariff=tariffs[j-1];
  const targets=new Set([Math.ceil(arrival),80,90,95]);for(let target=Math.max(5,Math.ceil(arrival/5)*5);target<=95;target+=5)targets.add(target);
  for(const target of targets){if(target<=arrival+.01||target>95)continue;const chargeMinutes=chargingMinutes(p,connection,arrival,target),gridEnergy=p.capacity*(target-arrival)/100/p.efficiency,price=sessionCost(tariff,gridEnergy,chargeMinutes),costKnown=current.costKnown&&Boolean(price?.complete)&&(!current.currency||price.currency===current.currency),cost=current.cost+(price?.amount||0);
   if(mode==='cost'&&!costKnown||budget!==null&&(!costKnown||cost>budget))continue;
   const stop={station,arrival,target,chargeMinutes,energy:gridEnergy,cost:price,connection};push(j,{...common,soc:target,minutes:common.minutes+chargeMinutes+4,cost,costKnown,currency:current.currency||price?.currency||null,stops:[...current.stops,stop]});
  }
 }
 if(!best)throw Error(mode==='cost'?'Nuk u gjet plan me tarifa të krahasueshme dhe rezervën e zgjedhur. Provo sipas kohës.':'Nuk u gjet plan i verifikuar me këta karikues dhe këtë rezervë. Zgjero korridorin ose kontrollo të dhënat e veturës.');
 return {...best,currency:best.costKnown?best.currency:null,analyzed:stations.length,mode,budget,estimated:true};
}
export function revalidateJourney(plan,p,road,terrain,routeKm,weather=[]){
 if(!Array.isArray(road.legs)||road.legs.length!==plan.stops.length+1)throw Error('Segmentet reale të planit nuk u kthyen.');
 let soc=p.soc,minutes=0,distance=0,energy=0,previous=0,cost=0,costKnown=true,currency=null;
 const stops=[];
 for(let i=0;i<road.legs.length;i++){
  const leg=road.legs[i],next=i<plan.stops.length?plan.stops[i].station.routePosition:routeKm;
  if(!Number.isFinite(leg.distance)||leg.distance<0||!Number.isFinite(leg.duration)||leg.duration<0)throw Error('Segmenti real është i paplotë.');
  const used=energyForKm(leg.distance/1000,p,{...terrainBetween(terrain,previous,next),temperature:p.temperature??weatherBetween(weather,previous,next)});
  energy+=used;soc-=used/p.capacity*100;
  if(!Number.isFinite(soc)||soc+1e-6<p.reserve)throw Error('Rruga reale cenon rezervën. Plani nuk është aktivizuar; provo alternativa.');
  if(i<plan.stops.length){
   const saved=plan.stops[i];if(saved.target<soc)throw Error('Rruga ndryshoi ndaj matricës. Rillogarit planin.');
   const chargeMinutes=chargingMinutes(p,saved.connection,soc,saved.target),gridEnergy=p.capacity*(saved.target-soc)/100/p.efficiency;
   const price=sessionCost(parseTariff(saved.station.price),gridEnergy,chargeMinutes);
   costKnown=costKnown&&Boolean(price?.complete)&&(!currency||currency===price.currency);
   cost+=price?.amount||0;currency=currency||price?.currency||null;
   stops.push({...saved,arrival:soc,chargeMinutes,energy:gridEnergy,cost:price});soc=saved.target;minutes+=chargeMinutes+4;
  }
  minutes+=leg.duration/60;distance+=leg.distance/1000;previous=next;
 }
 if(plan.budget!=null&&(!costKnown||cost>plan.budget+1e-8))throw Error('Rruga reale tejkalon buxhetin ose ka tarifa të panjohura. Rillogarit planin.');
 return {...plan,stops,soc,minutes,distance,energy,cost,costKnown,currency:costKnown?currency:null,line:road.line,verifiedAt:new Date().toISOString()};
}
