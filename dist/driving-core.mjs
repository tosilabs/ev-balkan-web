import {distance,routeProjection} from './core.mjs?v=3.6';
import {currentOperating} from './operating.mjs?v=3.6';

// Discovery ranking only. Road distance and ETA are requested separately.
export function drivingChoices(stations,{origin=null,line=null,fast=false,now=Date.now()}={}){
 const projection=origin&&line?.length?routeProjection(origin,line):null;
 const onRoute=projection&&projection.offsetKm<=1.5;
 return stations.flatMap(station=>{
  if(currentOperating(station,now).key==='offline')return [];
  const connections=(station.allConnections||station.connections||[]).filter(c=>fast?c.label==='CCS2'&&c.power>=50:['CCS2','Type 2'].includes(c.label));
  if(!connections.length)return [];
  if(onRoute&&Number.isFinite(station.routePosition)&&station.routePosition<projection.alongKm-.25)return [];
  const km=origin?distance(origin,station.point):null;
  return [{station,connections,km,progress:onRoute&&Number.isFinite(station.routePosition)?station.routePosition-projection.alongKm:null}];
 }).sort((a,b)=>{
  if(onRoute&&a.progress!==null&&b.progress!==null)return a.progress-b.progress||(a.km??0)-(b.km??0);
  return (a.km??Infinity)-(b.km??Infinity)||a.station.id.localeCompare(b.station.id);
 });
}
