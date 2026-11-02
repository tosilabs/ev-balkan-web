import {locationInfo,socketCurrent,bestClass,webUrl} from './details.mjs?v=2.0';
export function point(lat,lon){
  if(lat==null||lon==null||lat===''||lon==='')throw Error('Koordinata të pavlefshme.');
  lat=Number(lat);lon=Number(lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Koordinata të pavlefshme.');
  return {lat,lon};
}
export function coordinates(text){
  const parts=text.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/);
  return parts?point(parts[1],parts[2]):null;
}
const rad=x=>x*Math.PI/180, R=6371.0088;
export function distance(a,b){const h=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lon-a.lon)/2)**2;return R*2*Math.asin(Math.sqrt(Math.min(1,h)));}
export function corridorDistance(p,line){
  if(!line.length)throw Error('Itinerari është bosh.');
  let best=distance(p,line[0]);
  const scale=Math.cos(rad(p.lat));
  for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],ax=rad(a.lon-p.lon)*R*scale,ay=rad(a.lat-p.lat)*R,bx=rad(b.lon-p.lon)*R*scale,by=rad(b.lat-p.lat)*R;
    const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/d)):0;
    best=Math.min(best,Math.hypot(ax+t*dx,ay+t*dy));
  }
  return best;
}
export function bounds(line,padding){
  if(!line.length)throw Error('Mungojnë pikat e kërkimit.');
  let south=90,north=-90,west=180,east=-180;
  for(const p of line){south=Math.min(south,p.lat);north=Math.max(north,p.lat);west=Math.min(west,p.lon);east=Math.max(east,p.lon);}
  const latPad=padding/110,lonPad=padding/(110*Math.max(.1,Math.cos(rad(north+latPad))));
  return [Math.max(-90,south-latPad),Math.max(-180,west-lonPad),Math.min(90,north+latPad),Math.min(180,east+lonPad)];
}
export function settings(raw={}){
  const radius=Number(raw.radius??10),minPower=Number(raw.minPower??0),connector=raw.connector??'both',speed=raw.speed??'all';
  if(!Number.isFinite(radius)||radius<1||radius>100||!Number.isFinite(minPower)||minPower<0||minPower>1000||!['all','both','CCS2','Type 2'].includes(connector)||!['all','slow','medium','fast','ultra','unknown'].includes(speed))throw Error('Rrezja duhet të jetë 1–100 km dhe fuqia 0–1000 kW.');
  return {radius,minPower,connector,speed,activeOnly:Boolean(raw.activeOnly),includeUnknown:Boolean(raw.includeUnknown)};
}
function power(value){
  if(!value)return 0;
  return Math.max(0,...String(value).split(';').map(part=>{const n=Number.parseFloat(part.replace(',','.'));return Number.isFinite(n)?n*(/\bW\b/i.test(part)&&!/kW/i.test(part)?1/1000:1):0;}));
}
export function validStationId(id){return /^(node|way|relation)\/\d+$/.test(id)||/^(myfah|fines|zagreb|ocm)\/[A-Za-z0-9_.:%*+!-]{1,220}$/.test(id);}
const officialSources={ocm:{name:'Open Charge Map',url:'https://openchargemap.org/about/terms'},myfah:{name:'MYFAH · Ministria greke',url:'https://electrokinisi.yme.gov.gr/public/HelpMyfah/PublicData/'},fines:{name:'Fines Charging · API publike',url:'https://finescharging.com/public-api'},zagreb:{name:'Qyteti i Zagrebit · data.gov.hr',url:'https://data.gov.hr/ckan/en/dataset/geoportal-elektricne-punionice'}};
export function parseStations(data,options,center,line=null){
  const out=[],seen=new Set();
  for(const element of data.elements??[]){
    const tags=element.tags??{},raw=element.center??element;
    if(raw.lat==null||raw.lon==null)continue;
    let p;try{p=point(raw.lat,raw.lon);}catch{continue;}
    const id=`${element.type}/${element.id}`;if(!validStationId(id)||seen.has(id))continue;seen.add(id);
    if(tags.access==='private'||tags.access==='no')continue;
    if(tags['disused:amenity']||tags['abandoned:amenity']||tags.operational_status==='closed')continue;
    const labels={type2_combo:'CCS2',type2:'Type 2',chademo:'CHAdeMO',type1:'Type 1',type1_combo:'CCS1',tesla_supercharger:'Tesla',tesla_destination:'Tesla',schuko:'Schuko'};
    let connections=Object.entries(tags).filter(([key,count])=>/^socket:[^:]+$/.test(key)&&count&&count!=='0'&&count!=='no')
      .map(([key])=>({label:labels[key.slice(7)]||key.slice(7).replaceAll('_',' '),power:power(tags[key+':output']),current:socketCurrent(key.slice(7)),count:/^\d+$/.test(tags[key])?Number(tags[key]):null}));
    if(Array.isArray(element.connections))connections=element.connections.filter(c=>typeof c.label==='string'&&c.label.length<=80).map(c=>({label:c.label,current:['AC','DC'].includes(c.current)?c.current:'',power:Number.isFinite(c.power)&&c.power>0&&c.power<=2000?c.power:0,count:Number.isInteger(c.count)&&c.count>0?c.count:null,voltage:Number.isFinite(c.voltage)&&c.voltage>0?c.voltage:null,amps:Number.isFinite(c.amps)&&c.amps>0?c.amps:null}));
    const unknown=connections.length===0;
    if(unknown&&(!options.includeUnknown||options.minPower>0))continue;
    const matching=connections.filter(c=>(options.connector==='all'||(options.connector==='both'&&['CCS2','Type 2'].includes(c.label))||c.label===options.connector)&&c.power>=options.minPower);
    if(!unknown&&!matching.length)continue;
    const speed=bestClass(matching);
    if(options.speed!=='all'&&options.speed!==speed.key&&!(options.speed==='fast'&&speed.key==='ultra'))continue;
    const km=line?corridorDistance(p,line):distance(center,p);
    if(km>options.radius)continue;
    const address=[tags['addr:street'],tags['addr:housenumber'],tags['addr:city']].filter(Boolean).join(' ');
    const origin=element.type==='ocm'?{name:'Open Charge Map',url:`https://openchargemap.org/site/poi/details/${element.id}`} : officialSources[element.type]||{name:'OpenStreetMap',url:`https://www.openstreetmap.org/${id}`};
    const provenance=(element.provenance||[]).filter(p=>p&&typeof p.name==='string'&&webUrl(p.url)).slice(0,8).map(p=>({name:p.name,url:webUrl(p.url),license:String(p.license||''),fetchedAt:String(p.fetchedAt||'')}));
    if(!provenance.length)provenance.push({name:origin.name,url:origin.url,license:element.type==='node'||element.type==='way'||element.type==='relation'?'ODbL-1.0':'Sipas kushteve të burimit'});
    out.push({id,name:tags.name||tags.brand||tags.operator||'Stacion karikimi',point:p,address,operator:tags.operator||tags.brand||'',connectors:unknown?'Lidhësi i paspecifikuar':matching.map(c=>c.label).join(' / '),power:Math.max(0,...matching.map(c=>c.power)),unknown,compatible:matching.some(c=>['CCS2','Type 2'].includes(c.label)),distance:km,
      connections:matching,allConnections:connections,speed,info:{...locationInfo(tags),metadata:element.metadata||{}},price:tags.charge||(tags.fee==='no'?'Pa pagesë, sipas regjistrit':''),hours:tags.opening_hours||'',access:tags.access||'',source:origin.url,sourceName:origin.name,provenance,sourceUpdatedAt:String(element.sourceUpdatedAt||''),finesId:/^\d+$/.test(String(element.finesId||''))?String(element.finesId):''});
  }
  return out.sort((a,b)=>a.distance-b.distance);
}
export function destinationUrl(station){const p=point(station.point.lat,station.point.lon);return `https://www.google.com/maps/search/?api=1&query=${p.lat}%2C${p.lon}`;}
export function shareData(station){return {title:station.name,text:[station.name,station.address].filter(Boolean).join(' — '),url:destinationUrl(station)};}
export function navigationUrl(station,target){const p=point(station.point.lat,station.point.lon);return target==='waze'?`https://waze.com/ul?ll=${p.lat},${p.lon}&navigate=yes`:`https://osmand.net/map?pin=${p.lat},${p.lon}&finish=${p.lat},${p.lon}&profile=car`;}
