import {sampleRoute} from './terrain.mjs?v=3.5';
import {requestJson} from './services.mjs?v=3.5';
const variables=['temperature_2m','precipitation','precipitation_probability','snowfall','weather_code','visibility','wind_speed_10m','wind_gusts_10m','is_day'];
const cache=new Map();
const number=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max?x:null;
export function weatherKind(code){
 if(code===0)return {icon:'☀',name:'Kthjellët'};
 if([1,2].includes(code))return {icon:'⛅',name:'Pjesërisht me re'};
 if(code===3)return {icon:'☁',name:'Me re'};
 if([45,48].includes(code))return {icon:'≋',name:'Mjegull'};
 if([56,57,66,67].includes(code))return {icon:'❄',name:'Reshje të ngrira'};
 if([71,73,75,77,85,86].includes(code))return {icon:'❄',name:'Borë'};
 if([95,96,99].includes(code))return {icon:'ϟ',name:'Stuhi'};
 if([51,53,55,61,63,65,80,81,82].includes(code))return {icon:'☂',name:'Shi / reshje'};
 return {icon:'?',name:'Pa të dhëna'};
}
export function weatherAdvisories(p){
 const out=[];const add=(key,label,level='notice')=>out.push({key,label,level});
 if([95,96,99].includes(p.code))add('storm','Stuhi e parashikuar','high');
 if(p.gusts!==null&&p.gusts>=60)add('wind',`Rafale të forta: ${Math.round(p.gusts)} km/h`,p.gusts>=80?'high':'notice');
 if((p.snowfall!==null&&p.snowfall>=.2)||[71,73,75,77,85,86].includes(p.code))add('snow','Borë e parashikuar',p.snowfall>=1?'high':'notice');
 if([56,57,66,67].includes(p.code))add('freezing','Reshje të ngrira të parashikuara','high');
 else if(p.temperature!==null&&p.temperature<=2&&p.precipitation!==null&&p.precipitation>.1)add('ice','Mundësi ngrice: reshje dhe temperaturë afër/nën 0°C');
 if(p.visibility!==null&&p.visibility<1000)add('visibility',`Dukshmëri e ulët: ${Math.round(p.visibility)} m`,p.visibility<200?'high':'notice');
 if(p.precipitation!==null&&p.precipitation>=5)add('rain',`Reshje të forta: ${p.precipitation.toFixed(1)} mm/orë`,p.precipitation>=10?'high':'notice');
 return out;
}
export function routeWeatherPoints(line,center){return line?sampleRoute(line,{spacingKm:25,maxPoints:20}):[{lat:center.lat,lon:center.lon,km:0,label:'Vendi i kërkimit'}];}
export async function fetchWeather(points,{signal,request=requestJson,now=Date.now(),force=false}={}){
 const key=points.map(p=>`${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join(';'),old=cache.get(key);
 if(!force&&old&&now-old.at<600000)return old.data;
 const url=`https://api.open-meteo.com/v1/forecast?latitude=${points.map(p=>p.lat.toFixed(5)).join(',')}&longitude=${points.map(p=>p.lon.toFixed(5)).join(',')}&hourly=${variables.join(',')}&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm&timezone=GMT&timeformat=unixtime&forecast_days=3`;
 const response=await request(url,{signal,timeout:11000}),locations=Array.isArray(response)?response:[response];
 if(locations.length!==points.length)throw Error('Moti nuk u kthye për të gjitha pikat e kërkuara.');
 const data={locations:locations.map(l=>l?.hourly||null),fetchedAt:new Date(now).toISOString()};
 if(!data.locations.some(h=>Array.isArray(h?.time)&&h.time.some(t=>Number.isFinite(t))))throw Error('Nuk u mor një parashikim i vlefshëm.');
 if(cache.size>=12)cache.delete(cache.keys().next().value);cache.set(key,{at:now,data});return data;
}
export function selectForecast(data,points,{departure=Date.now(),duration=null,arrival=true}={}){
 const total=points.at(-1)?.km||0,timed=arrival&&Number.isFinite(duration)&&duration>0;
 return points.map((point,i)=>{
  const target=departure+(timed&&total?duration*1000*point.km/total:0),h=data.locations[i],times=Array.isArray(h?.time)?h.time:[];
  const index=times.findIndex(t=>Number.isFinite(t)&&t*1000>=target&&t*1000-target<=3600000);
  const read=(key,min,max)=>index>=0?number(h?.[key]?.[index],min,max):null;
  const p={...point,target,time:index>=0?times[index]*1000:null,temperature:read('temperature_2m',-90,65),precipitation:read('precipitation',0,500),probability:read('precipitation_probability',0,100),snowfall:read('snowfall',0,100),code:read('weather_code',0,99),visibility:read('visibility',0,200000),wind:read('wind_speed_10m',0,500),gusts:read('wind_gusts_10m',0,500)};
  return {...p,kind:weatherKind(p.code),advisories:weatherAdvisories(p)};
 });
}
export function radarFrames(data,now=Date.now()){
 let host;try{host=new URL(data.host);}catch{throw Error('Burimi i radarit nuk është i vlefshëm.');}
 if(host.protocol!=='https:'||host.hostname!=='tilecache.rainviewer.com'||host.username||host.password)throw Error('Host i panjohur i radarit.');
 const frames=(Array.isArray(data.radar?.past)?data.radar.past:[]).filter(f=>Number.isFinite(f.time)&&f.time*1000<=now+300000&&f.time*1000>=now-3*3600000&&/^\/v2\/radar\/[a-zA-Z0-9_-]{1,128}$/.test(f.path)).sort((a,b)=>a.time-b.time).slice(-13);
 if(!frames.length||now-frames.at(-1).time*1000>90*60000)throw Error('Nuk ka pamje mjaftueshëm të reja të radarit.');
 return {host:host.origin,frames,stale:now-frames.at(-1).time*1000>30*60000};
}
export function radarTile(data,index){const frame=data.frames[index];if(!frame)throw Error('Pamje e panjohur');return `${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;}
