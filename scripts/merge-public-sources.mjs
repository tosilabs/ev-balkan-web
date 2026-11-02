import {readFile,writeFile} from 'node:fs/promises';
import {myfahLocations,finesLocations,zagrebLocations,ocmLocations,mergeLocations} from './source-adapters.mjs';
import {requestJson} from '../dist/services.mjs';
const base=JSON.parse(await readFile('dist/data/osm-base.json','utf8'));
const fetchedAt=new Date().toISOString(),sources=[{id:'osm',name:'OpenStreetMap',country:'Ballkani dhe zona përreth',status:'active',count:base.elements.length,checkedAt:base.fetchedAt,url:'https://www.openstreetmap.org/copyright',license:'ODbL-1.0'}];
const extra=[];
async function input(name){try{return JSON.parse(await readFile(`.source-cache/${name}.json`,'utf8'));}catch{return {error:'Feed was not downloaded'};}}
const configs=[
 {id:'ocm',name:'Open Charge Map · kontributet me licencë të hapur',country:'AL, BA, BG, GR, HR, ME, MK, RO, RS, SI, XK',url:'https://github.com/openchargemap/ocm-export',license:'CC BY 4.0 · vetëm DataProviderID 1',normalize:ocmLocations},
 {id:'myfah',name:'MYFAH · regjistri kombëtar i Greqisë',country:'GR',url:'https://electrokinisi.yme.gov.gr/public/HelpMyfah/PublicData/',license:'Të dhëna publike MYFAH / AFIR',normalize:myfahLocations},
 {id:'fines',name:'Fines Charging · API publike',country:'BG',url:'https://finescharging.com/public-api',license:'API publike Fines; atribuim burimi',normalize:async data=>finesLocations(data,(await input('fines-live')).data,fetchedAt)},
 {id:'zagreb',name:'Qyteti i Zagrebit · data.gov.hr',country:'HR · Zagreb',url:'https://data.gov.hr/ckan/en/dataset/geoportal-elektricne-punionice',license:'Otvorena dozvola (OD)',normalize:zagrebLocations}
];
for(const config of configs){
 const feed=await input(config.id);let bundle,status='active',error='';
 try{
  if(!feed.data)throw Error(feed.error||'No data');
  const elements=await config.normalize(feed.data,fetchedAt);
  if(!elements.length)throw Error('The source returned no valid locations');
  bundle={id:config.id,fetchedAt,elements};await writeFile(`dist/data/source-${config.id}.json`,JSON.stringify(bundle));
 }catch(e){error=e.message;
  try{bundle=JSON.parse(await readFile(`dist/data/source-${config.id}.json`,'utf8'));}catch{
   try{bundle=await requestJson(`https://tosilabs.github.io/ev-balkan-web/data/source-${config.id}.json`,{timeout:8000});}catch{}
  }
  if(bundle?.elements?.length)status='cached';else status='unavailable';
 }
 if(bundle?.elements?.length)extra.push(...bundle.elements);
 const {normalize,...metadata}=config;sources.push({...metadata,status,count:bundle?.elements?.length||0,checkedAt:bundle?.fetchedAt||fetchedAt,error});
 console.log('SOURCE_IMPORT',config.id,status,bundle?.elements?.length||0,error);
}
const merged=mergeLocations(base.elements,extra);
const registry={...base,sourcesMerged:true,builtAt:fetchedAt,license:'Licenca sipas burimit të çdo regjistri',elements:merged.elements,sources,mergeReport:{additionalRecords:extra.length,matchedExisting:merged.merged,totalLocations:merged.elements.length}};
await writeFile('dist/data/charging-balkans.json',JSON.stringify(registry));
const discovery=[
 {id:'elevation-meteo',name:'Lartësia · Open-Meteo / Copernicus GLO-90',country:'Global',status:'on_demand',url:'https://open-meteo.com/en/docs/elevation-api',license:'CC BY 4.0; API falas vetëm për përdorim jokomercial',note:'Merret sipas itinerarit, maksimumi 100 pika për kërkesë. Nuk është matje e asfaltit ose e konsumit të veturës.'},
 {id:'elevation-topo',name:'Lartësia rezervë · Open Topo Data / SRTM90m',country:'Global',status:'on_demand',url:'https://www.opentopodata.org/datasets/srtm/',note:'Burim rezervë kur Open-Meteo nuk përgjigjet. Respektohet intervali mes kërkesave. Mungesat shënohen gri.'},
 {id:'eu-data',name:'data.europa.eu · portali evropian',country:'BE',status:'discovery_portal',url:'https://data.europa.eu/en',note:'Katalog për zbulimin e dataset-eve; nuk është një API e vetme me të gjithë karikuesit.'},
 {id:'si-nap',name:'NAP Slovenia · Prometej IDACS',country:'SI',status:'authorization_required',url:'https://nap.si/en/datasets_details?id=db82d062-1518-b71a-8036-9823bbd36e5a',license:'CC BY-SA 4.0 · falas',note:'API DATEX II kthen HTTP 401 pa autorizim. Kërkon regjistrim/qasje B2B; nuk është importuar.'},
 {id:'bg-nap',name:'BGNAP · portali kombëtar bullgar',country:'BG',status:'registration_required',url:'https://sipbg.gov.bg/bgnap/portal/en/instructions',note:'Dokumentacioni kërkon regjistrim dhe çelës API për zhvillues. Nuk është importuar si feed kombëtar.'},
 {id:'hr-nap',name:'NAP Croatia',country:'HR',status:'catalogue_only',url:'https://www.promet-info.hr/',note:'Portali kombëtar është identifikuar; importi aktiv kroat këtu është dataset-i publik i Qytetit të Zagrebit, jo gjithë NAP-i.'},
 {id:'eurostat',name:'Eurostat / EAFO · statistika',country:'BE',status:'aggregate_only',url:'https://ec.europa.eu/eurostat/databrowser/product/page/road_if_rchev',note:'Të dhëna statistikore; numërimet kombëtare nuk përdoren si lokacione në hartë.'}
];
await writeFile('dist/data/sources.json',JSON.stringify({checkedAt:fetchedAt,report:registry.mergeReport,sources:[...sources,...discovery]}));
if(!sources.some(s=>s.id!=='osm'&&s.status==='active'))throw Error('No new public data source could be imported');
console.log('MERGED_REGISTRY',JSON.stringify(registry.mergeReport));
