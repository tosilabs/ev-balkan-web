import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {requestJson} from '../dist/services.mjs';
const bounds=[34,12,48.5,30];
const query=`[out:json][timeout:25][maxsize:268435456];nwr["amenity"="charging_station"](${bounds.join(',')});out tags center;`;
const errors=[];
let snapshot;
for(const endpoint of ['https://ovp.dresel.systems/api/interpreter','https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter']){
 try{
  console.log('Downloading charging registry:',endpoint);
  const data=await requestJson(`${endpoint}?data=${encodeURIComponent(query)}`,{timeout:35000,headers:{'User-Agent':'EVBalkan/1.1 (https://github.com/tosilabs/ev-balkan-web)'}});
  if(data.remark||!Array.isArray(data.elements)||data.elements.length<100)throw Error(data.remark||'Incomplete charging registry');
  const elements=data.elements.map(e=>{
    const tags=Object.fromEntries(Object.entries(e.tags??{}).filter(([k])=>['name','brand','operator','amenity','charge','fee','opening_hours','access','operational_status','disused:amenity','abandoned:amenity'].includes(k)||k.startsWith('socket:')||k.startsWith('addr:')));
    const p=e.center??e;return {type:e.type,id:e.id,lat:p.lat,lon:p.lon,tags};
  }).filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lon));
  snapshot={fetchedAt:new Date().toISOString(),bounds,license:'ODbL-1.0',attribution:'© OpenStreetMap contributors',source:'https://www.openstreetmap.org/copyright',elements};
  break;
 }catch(error){console.error(endpoint,error.message);errors.push(error.message);}
}
if(!snapshot){
 try{
  console.log('Trying previously published registry without changing its timestamp');
  const data=await requestJson('https://tosilabs.github.io/ev-balkan-web/data/charging-balkans.json',{timeout:12000});
  if(!Array.isArray(data.elements)||data.elements.length<100||!data.fetchedAt)throw Error('No published registry');snapshot=data;
 }catch{
  try{const data=JSON.parse(await readFile('dist/data/charging-balkans.json','utf8'));if(!data.fetchedAt||data.elements?.length<100)throw Error('Invalid cached registry');snapshot=data;}catch{}
 }
}
if(!snapshot)throw Error('Cannot build a usable charging registry: '+errors.join('; '));
await mkdir('dist/data',{recursive:true});
await writeFile('dist/data/charging-balkans.json',JSON.stringify(snapshot));
console.log(`Registry ready: ${snapshot.elements.length} real OSM locations; fetched ${snapshot.fetchedAt}`);
