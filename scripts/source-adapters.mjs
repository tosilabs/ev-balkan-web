import {distance,point} from '../dist/core.mjs';
const SOURCE={
 ocm:{name:'Open Charge Map contributors',url:'https://openchargemap.org/about/terms',license:'CC BY 4.0'},
 myfah:{name:'MYFAH · Ministria greke',url:'https://electrokinisi.yme.gov.gr/public/HelpMyfah/PublicData/',license:'Të dhëna publike MYFAH / AFIR'},
 fines:{name:'Fines Charging · API publike',url:'https://finescharging.com/public-api',license:'API publike Fines; atribuim burimi'},
 zagreb:{name:'Qyteti i Zagrebit · të dhëna të hapura',url:'https://data.gov.hr/ckan/en/dataset/geoportal-elektricne-punionice',license:'Otvorena dozvola (OD)'}
};
const standards={IEC_62196_T2_COMBO:'CCS2',IEC_62196_T2:'Type 2',IEC_62196_T1_COMBO:'CCS1',IEC_62196_T1:'Type 1',CHADEMO:'CHAdeMO',TESLA_S:'Tesla',TESLA_R:'Tesla'};
function record(type,id,p,tags,connections,fetchedAt,extra={}){
 if(id==null||String(id)==='undefined')return null;
 try{p=point(p.lat,p.lon);}catch{return null;}
 return {type,id:encodeURIComponent(String(id)),lat:p.lat,lon:p.lon,tags:{amenity:'charging_station',...tags},connections,provenance:[{...SOURCE[type],recordId:String(id),fetchedAt}],...extra};
}
function group(connectors){
 const groups=new Map();
 for(const c of connectors){const key=c.label+'|'+c.current+'|'+c.power;const old=groups.get(key);if(old)old.count++;else groups.set(key,{...c,count:1});}
 return [...groups.values()];
}
export function myfahLocations(data,fetchedAt){
 if(!Array.isArray(data.Locations))throw Error('MYFAH: missing Locations array');
 return data.Locations.filter(l=>l.publish!==false).map(l=>{
  const connections=[];const evses=l.evses??[];
  for(const e of evses)for(const c of e.connectors??[]){
   const watts=Number(c.max_electric_power);const kw=Number.isFinite(watts)&&watts>0?watts/1000:0;
   connections.push({label:standards[c.standard]||String(c.standard||'Lidhës i paspecifikuar'),current:c.power_type==='DC'?'DC':String(c.power_type||'').startsWith('AC')?'AC':'',power:kw,voltage:Number.isFinite(c.max_voltage)?c.max_voltage:null,amps:Number.isFinite(c.max_amperage)?c.max_amperage:null});
  }
  const tags={name:l.name||l.address||'Stacion karikimi',operator:l.operator?.name||'',website:l.operator?.website||'',image:(l.images??[]).find(i=>['LOCATION','CHARGER'].includes(i.category))?.url||'', 'addr:street':l.address||'','addr:city':l.city||'','addr:country':'GR',opening_hours:l.opening_times?.twentyfourseven?'24/7':''};
  return record('myfah',[l.country_code||'GR',l.party_id||'',l.id].join(':'),{lat:l.coordinates?.latitude,lon:l.coordinates?.longitude},tags,group(connections),fetchedAt,{metadata:{accessNotes:(l.directions||[]).filter(d=>d.language==='en').map(d=>d.text).join(' '),parking:l.parking_type||'',facilities:(l.facilities||[]).join(', '),chargingWhenClosed:typeof l.charging_when_closed==='boolean'?l.charging_when_closed:null},sourceUpdatedAt:l.last_updated||'',evseIds:evses.map(e=>e.evse_id).filter(Boolean)});
 }).filter(Boolean);
}
function plug(label){const s=String(label).toLowerCase();return /ccs.*(?:2|combo 2)|combo 2/.test(s)?{label:'CCS2',current:'DC'}:/ccs.*1|combo 1/.test(s)?{label:'CCS1',current:'DC'}:/chademo/.test(s)?{label:'CHAdeMO',current:'DC'}:/type.?2|type 2/.test(s)?{label:'Type 2',current:'AC'}:/type.?1/.test(s)?{label:'Type 1',current:'AC'}:{label:String(label||'Lidhës i paspecifikuar'),current:''};}
export function finesLocations(data,live,fetchedAt){
 if(!Array.isArray(data.features))throw Error('Fines: missing GeoJSON features');
 const byId=new Map((live?.locations??[]).map(l=>[String(l.location_id),l]));
 return data.features.map(f=>{
  const p=f.properties??{},id=f.id??p.id,location=byId.get(String(id));let connections=[];
  if(location?.connectors?.length)connections=group(location.connectors.map(c=>({...plug(c.plug_type),power:Number.isFinite(c.max_power_kw)&&c.max_power_kw>0?c.max_power_kw:0})));
  else {const types=Object.entries(p.connectors??{});connections=types.map(([type,count])=>({...plug(type),count:Number(count)||null,power:types.length===1&&Number.isFinite(p.max_power_kw)?p.max_power_kw:0}));}
  const price=p.price_range;let tariff='';
  if(price?.currency==='EUR'&&price?.unit==='kWh'&&Number.isFinite(price.min)&&price.min>=0&&Number.isFinite(price.max)&&price.max>=price.min)tariff=(price.min===price.max?price.min.toFixed(2):price.min.toFixed(2)+'–'+price.max.toFixed(2))+' EUR/kWh (burimi: Fines)';
  return record('fines',id,{lat:f.geometry?.coordinates?.[1],lon:f.geometry?.coordinates?.[0]},{name:p.name||'Fines Charging',operator:'Fines Charging','operator:website':'https://finescharging.com/','addr:street':p.address||'',charge:tariff,description:p.restricted?'Qasje e kufizuar ose me kushte sipas operatorit.':''},connections,fetchedAt,{finesId:String(id),sourceUpdatedAt:data.generated_at||''});
 }).filter(Boolean);
}
export function zagrebLocations(data,fetchedAt){
 if(!Array.isArray(data.features))throw Error('Zagreb: missing GeoJSON features');
 return data.features.map(f=>{const p=f.properties??{},description=['Regjistri i Qytetit të Zagrebit.',p.BROJ_UTICNICA!=null?`${p.BROJ_UTICNICA} prizë/a të raportuara.`:'',p.TIP_UTICNICE?`Rryma e raportuar: ${p.TIP_UTICNICE}.`:'','Fuqia dhe standardi i lidhësit nuk specifikohen nga ky burim.'].filter(Boolean).join(' ');
  return record('zagreb',p.OBJECTID_1??p.OBJECTID??f.id,{lat:f.geometry?.coordinates?.[1],lon:f.geometry?.coordinates?.[0]},{name:p.NAZIV||'Stacion karikimi','addr:street':p.ADRESA||'','addr:city':'Zagreb','addr:country':'HR',description},[],fetchedAt);
 }).filter(Boolean);
}
export function ocmLocations(data,fetchedAt){
 if(!Array.isArray(data.records)||!data.reference)throw Error('OCM export has no records/reference');
 const lookup=(list,id)=>data.reference[list]?.find(x=>x.ID===id)||{};
 const contributor=lookup('DataProviders',1);
 if(contributor.IsOpenDataLicensed!==true||!contributor.License)throw Error('OCM contributor license is not confirmed');
 const permitted=p=>p.IsOpenDataLicensed===true&&p.DataProviderStatusType?.IsProviderEnabled!==false&&typeof p.License==='string'&&!/non.?commercial|by-nc/i.test(p.License)&&/CC[ -]?0|CC[ -]?BY|creative commons attribution|creativecommons.org\/licenses\/by\//i.test(p.License);
 const known={33:'CCS2',32:'CCS1',25:'Type 2',103:'Type 2',1:'Type 1',2:'CHAdeMO',30:'Tesla',27:'Tesla'};
 return data.records.filter(l=>permitted(lookup('DataProviders',l.DataProviderID))&&[100,200].includes(l.SubmissionStatusTypeID)&&![100,150,200,210].includes(l.StatusTypeID)&&![2,3,6].includes(l.UsageTypeID)).map(l=>{
  const provider=lookup('DataProviders',l.DataProviderID);const a=l.AddressInfo||{},operator=lookup('Operators',l.OperatorID),usage=lookup('UsageTypes',l.UsageTypeID),country=lookup('Countries',a.CountryID);
  if(a.Latitude<34||a.Latitude>48.5||a.Longitude<12||a.Longitude>30)return null;
  const connections=(l.Connections||[]).map(c=>({label:known[c.ConnectionTypeID]||lookup('ConnectionTypes',c.ConnectionTypeID).Title||'Lidhës i paspecifikuar',current:c.CurrentTypeID===30?'DC':[10,20].includes(c.CurrentTypeID)?'AC':'',power:Number.isFinite(c.PowerKW)&&c.PowerKW>0?c.PowerKW:0,count:Number.isInteger(c.Quantity)&&c.Quantity>0?c.Quantity:null,voltage:Number.isFinite(c.Voltage)?c.Voltage:null,amps:Number.isFinite(c.Amps)?c.Amps:null}));
  const tags={name:a.Title||'Stacion karikimi',operator:operator.Title?.startsWith('(')?'':operator.Title||'','operator:website':operator.WebsiteURL||'',website:a.RelatedURL||'','addr:street':[a.AddressLine1,a.AddressLine2].filter(Boolean).join(', '),'addr:city':a.Town||'','addr:postcode':a.Postcode||'','addr:country':country.ISOCode||'',description:l.GeneralComments||'',phone:a.ContactTelephone1||a.ContactTelephone2||operator.PhonePrimaryContact||'','contact:email':a.ContactEmail||operator.ContactEmail||'',capacity:l.NumberOfPoints?String(l.NumberOfPoints):'',charge:l.UsageCost||'','check_date':l.DateLastVerified||'',access:l.UsageTypeID===4?'members':'yes', 'authentication:membership_card':usage.IsMembershipRequired===true?'yes':''};
  return record('ocm',l.ID,{lat:a.Latitude,lon:a.Longitude},tags,connections,fetchedAt,{sourceUpdatedAt:l.DateLastStatusUpdate||'',metadata:{accessNotes:a.AccessComments||'',usage:usage.Title||'',registryStatus:lookup('StatusTypes',l.StatusTypeID).Title||'',registryStatusAt:l.DateLastStatusUpdate||'',reference:l.OperatorsReference||'',numberOfPoints:l.NumberOfPoints||null},provenance:[{name:provider.Title||'Open Charge Map contributors',url:`https://openchargemap.org/site/poi/details/${l.ID}`,license:provider.License,recordId:String(l.ID),fetchedAt}]});
 }).filter(Boolean);
}

const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'');
export function mergeLocations(osm,additional){
 const records=[...osm];let merged=0;
 const grid=new Map(),cell=p=>`${Math.floor(p.lat*1000)},${Math.floor(p.lon*1000)}`;
 function index(e){const p=e.center??e;if(p.lat==null||p.lon==null)return;const key=cell(p);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(e);}
 records.forEach(index);
 for(const incoming of additional){
  const p={lat:incoming.lat,lon:incoming.lon};
  const candidates=[];const x=Math.floor(p.lat*1000),y=Math.floor(p.lon*1000);
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)candidates.push(...(grid.get(`${x+dx},${y+dy}`)||[]));
  const existing=candidates.find(e=>{
   if(e.type===incoming.type)return false;
   const q=e.center??e;if(q.lat==null||q.lon==null)return false;
   const a=e.tags??{},b=incoming.tags??{};
   const sameOperator=norm(a.operator||a.network||a.brand)&&norm(a.operator||a.network||a.brand)===norm(b.operator||b.network||b.brand);
   const sameName=norm(a.name).length>5&&norm(a.name)===norm(b.name);
   const refs=String(a['ref:EU:EVSE']||'').split(';');const sameId=incoming.evseIds?.some(id=>refs.includes(id));
   return (sameOperator||sameName||sameId)&&distance(p,{lat:q.lat,lon:q.lon})<=.035;
  });
  if(!existing){records.push(incoming);index(incoming);continue;}
  merged++;
  // Keep the map identity and photos; prefer richer connector data from the official feed.
  const old=existing.tags??{};
  const incomingTags=Object.fromEntries(Object.entries(incoming.tags).filter(([,v])=>v!==''&&v!=null));
  existing.tags=incoming.type==='ocm'?{...incomingTags,...Object.fromEntries(Object.entries(old).filter(([,v])=>v!==''&&v!=null))}:{...old,...incomingTags};
  if(incoming.connections.length&&(!existing.connections?.length||incoming.type!=='ocm'))existing.connections=incoming.connections;
  if(incoming.metadata)existing.metadata={...(existing.metadata||{}),...incoming.metadata};
  existing.provenance=[...(existing.provenance??(existing.type==='node'||existing.type==='way'||existing.type==='relation'?[{name:'OpenStreetMap contributors',url:`https://www.openstreetmap.org/${existing.type}/${existing.id}`,license:'ODbL-1.0'}]:[])),...incoming.provenance];
  if(incoming.finesId)existing.finesId=incoming.finesId;
  if(incoming.sourceUpdatedAt)existing.sourceUpdatedAt=incoming.sourceUpdatedAt;
 }
 return {elements:records,merged};
}
