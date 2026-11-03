import {createNavigation} from './navigation.mjs?v=3.4';
let navigation=null;
import {createKeyVaultUI} from './key-vault-ui.mjs?v=3.4';
import {createInterface} from './interface.mjs?v=3.4';
import {createDriving} from './driving.mjs?v=3.4';
let driving=null;
import {createJourneyTools} from './journey-ui.mjs?v=3.4';
let journeyTools=null;
import {point,coordinates,distance,bounds,settings,parseStations,validStationId,destinationUrl,shareData,navigationUrl} from './core.mjs?v=3.4';
import {localPlaces} from './cities.mjs?v=3.4';
import {requestJson as json,loadCharging} from './services.mjs?v=3.4';
import {externalLocationUrl,bestClass,webUrl,setProviderCatalog} from './details.mjs?v=3.4';
import {photoSection} from './photos.mjs?v=3.4';
import {finesLiveSection,showSources} from './sources-ui.mjs?v=3.4';
import {checkOperating,currentOperating,workingOnly} from './operating.mjs?v=3.4';
import {loadTerrain,coloredPieces,TERRAIN} from './terrain.mjs?v=3.4';
import {renderProfile} from './terrain-ui.mjs?v=3.4';
import {cleanHistory,cleanHistoryEntry,addHistory,encodeHistory,historyLabel} from './history.mjs?v=3.4';
import {stationTravel,formatTravel} from './travel.mjs?v=3.4';
import {createLocationLayer,locationFix} from './location.mjs?v=3.4';
let locationLayer=null,locationWatch=null;
import {initBasemap} from './basemap.mjs?v=3.4';
let detailStation=null,stationFromList=false,travelController=null,manualTravelOrigin=null,deviceLocation=null,gpsDenied=false;
import {routeWeatherPoints,fetchWeather,selectForecast,radarFrames,radarTile} from './weather.mjs?v=3.4';
import {renderWeatherRows} from './weather-ui.mjs?v=3.4';
let weatherState=null,weatherController=null,weatherLayer=null,radarData=null,radarFetchedAt=0,radarController=null,radarLayer=null,radarCoverage=null,radarTimer=null;
import {stationMap} from './mini-map.mjs?v=3.4';
let miniMapDisposers=[];
let candidates=[],lastSearch=null,routeState=null,terrainController=null,terrainMarker=null,chartControl=null,pendingReplay=null;
import {migrateLegacyStorage} from './storage.mjs?v=3.4';
migrateLegacyStorage();
const $=id=>document.getElementById(id);
const providerReady=json(new URL('./data/providers.json',import.meta.url).href,{timeout:4000}).catch(()=>json(new URL('./providers.json',import.meta.url).href,{timeout:4000})).then(setProviderCatalog).catch(()=>{});
const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{toast('Telefoni nuk lejoi ruajtjen lokale. Kërkimi mbetet i përdorshëm.');}}};
let mode='near',active=null,stations=[],shown=0,savedView=false,selectedStation=null,map=null,markers=null,routeLayer=null,searchMarker=null,picking=false,radiusLayer=null,viewingRadius=10,originMarker=null;
let searchHistory=cleanHistory(storage.get('udhembare-history-v1',[]));
let favourites=storage.get('udhembare-favourites',[]);
if(!Array.isArray(favourites))favourites=[];
favourites=favourites.filter(s=>{try{return s&&typeof s.id==='string'&&validStationId(s.id)&&typeof s.name==='string'&&point(s.point.lat,s.point.lon)&&Number.isFinite(s.distance);}catch{return false;}}).slice(0,200);
let restored;
try{restored=settings(storage.get('udhembare-settings-v2',{radius:10,minPower:0,connector:'all',includeUnknown:true}));}catch{restored=settings({radius:10,minPower:0,connector:'all',includeUnknown:true});}
$('radius').value=String(restored.radius);if(!$('radius').value)$('radius').value='10';
$('power').value=String(restored.minPower);if(!$('power').value)$('power').value='0';
$('route-order').value=restored.routeSort;syncAlongRoute();
$('connector').value=restored.connector;$('speed').value=restored.speed;$('unknown').checked=restored.includeUnknown;
$('only-active').checked=restored.activeOnly;$('open-24').checked=restored.open24;syncActive();
$('origin').value=String(storage.get('udhembare-origin','')).slice(0,300);
$('origin-mode').value=storage.get('udhembare-origin-mode','gps')==='manual'?'manual':'gps';
syncOrigin();
$('destination').value=String(storage.get('udhembare-query','')).slice(0,300);
function text(tag,value,className){const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node;}
function toast(message,error=false){$('status').textContent=message;$('status').title=message;$('results-note').textContent=message;$('status').classList.toggle('error',error);}
function showResults(open=true){if(open){journeyTools?.close();closeStation();setTerrainOpen(false);setWeatherOpen(false);}$('results-panel').hidden=!open;document.body.classList.toggle('results-open',open);$('list-open').setAttribute('aria-expanded',String(open));}
function openSearch(){journeyTools?.close();setWeatherOpen(false);closeStation();setTerrainOpen(false);showResults(false);$('search-dialog').showModal();}
$('search-open').addEventListener('click',openSearch);
$('filters-open').addEventListener('click',openSearch);
$('list-open').addEventListener('click',()=>showResults($('results-panel').hidden));
$('results-close').addEventListener('click',()=>showResults(false));
$('status').addEventListener('click',()=>showResults(true));
$('locate-me').addEventListener('click',()=>{if(active)return;chooseMode('near');showResults(false);$('radius').value='10';$('search-form').requestSubmit();});
function busy(value){navigation?.refresh();if(value)journeyTools?.reset();document.body.classList.toggle('busy',value);$('cancel').hidden=!value;
  document.querySelectorAll('#search-form input,#search-form select,#search-form button[type=submit],.tabs button,#saved-open,#pick-map,#locate-me,#filters-open,#search-open,#active-toggle,#history-open').forEach(el=>el.disabled=value);
  driving?.refresh();
}
function syncAlongRoute(){$('along-route').setAttribute('aria-pressed',String(Number($('radius').value)===.3));}
$('along-route').addEventListener('click',()=>{$('radius').value='0.3';$('route-order').value='progress';syncAlongRoute();});
$('radius').addEventListener('change',syncAlongRoute);
function chooseMode(value){
  mode=value;$('route-controls').hidden=value!=='route';syncAlongRoute();syncOrigin();$('pick-destination').hidden=value==='near';$('place-field').hidden=value==='near';$('destination').required=value!=='near';
  $('mode-description').textContent=value==='near'?'Karikuesit më të afërt me vendndodhjen tënde.':value==='route'?'Gjej karikues përgjatë gjithë itinerarit, të renditur nga nisja drejt destinacionit.':'Kërko karikues pranë një qyteti, adrese ose pike në hartë.';
  $('origin-field').hidden=value!=='route';
  $('radius-label').textContent=value==='route'?'LARGËSIA NGA RRUGA':'RREZJA';
  $('search-form').setAttribute('aria-labelledby',`tab-${value}`);
  document.querySelectorAll('[data-mode]').forEach(el=>{const selected=el.dataset.mode===value;el.setAttribute('aria-selected',String(selected));el.tabIndex=selected?0:-1;});
}
for(const button of document.querySelectorAll('[data-mode]')){
  button.addEventListener('click',()=>chooseMode(button.dataset.mode));
  button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const buttons=[...document.querySelectorAll('[data-mode]')];let i=buttons.indexOf(button);i=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3;buttons[i].click();buttons[i].focus();});
}
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>$(button.dataset.close).close());
$('sources-open').addEventListener('click',()=>showSources($('sources-content'),$('sources-dialog')));
$('help-open').addEventListener('click',()=>$('help-dialog').showModal());
function savedCount(){$('saved-count').textContent=String(favourites.length);}
savedCount();
function mapInit(){
  if(!window.L){$('map-fallback').hidden=false;$('pick-map').disabled=true;return;}
  map=L.map('map',{scrollWheelZoom:true,minZoom:2,maxZoom:19}).setView([41.9981,21.4254],14);
  initBasemap(map,L);
  locationLayer=createLocationLayer(map,L);
  markers=L.layerGroup().addTo(map);
  map.on('dragstart',()=>driving?.dragged());
  map.on('click',event=>{
    if(!picking||active)return;
    const p=point(event.latlng.lat.toFixed(6),event.latlng.lng.toFixed(6));
    if(picking==='travel-origin'){manualTravelOrigin=p;stopPicking();if(detailStation)openStation(detailStation,stationFromList);return;}
    if(picking==='origin'){
      $('origin-mode').value='manual';$('origin').value=`${p.lat},${p.lon}`;syncOrigin();
      if(originMarker)map.removeLayer(originMarker);originMarker=L.circleMarker([p.lat,p.lon],{radius:8,color:'#8052b3',fillOpacity:.7}).addTo(map);
      stopPicking();openSearch();return;
    }
    const routeDestination=picking==='destination'&&mode==='route';
    if(!routeDestination)chooseMode('place');$('destination').value=`${p.lat},${p.lon}`;
    if(searchMarker)map.removeLayer(searchMarker);
    searchMarker=L.circleMarker([p.lat,p.lon],{radius:8,color:'#123e35',fillColor:'#d6ef9a',fillOpacity:1}).addTo(map);
    stopPicking();
    if(routeDestination){openSearch();return;}
    toast('Duke kërkuar rreth pikës së zgjedhur…');$('search-form').requestSubmit();
  });
}
mapInit();
function syncOrigin(){const manual=$('origin-mode').value==='manual';$('origin-manual').hidden=!manual;$('origin').required=mode==='route'&&manual;}
$('origin-mode').addEventListener('change',()=>{syncOrigin();$('location-note').hidden=true;});
function stopPicking(){picking=false;$('pick-hint').hidden=true;$('pick-map').classList.remove('active');$('pick-map').textContent='⌖';$('pick-map').setAttribute('aria-label','Zgjidh pikë në hartë');}
function startPicking(target){
 if(!map||active)return;setTerrainOpen(false);if($('search-dialog').open)$('search-dialog').close();showResults(false);picking=target;
 $('pick-map').classList.add('active');$('pick-map').textContent='×';$('pick-map').setAttribute('aria-label','Anulo zgjedhjen e pikës');
 $('pick-hint').textContent=(target==='travel-origin'?'Prek hartën për nisjen te stacioni':target==='origin'?'Prek hartën për pikën e nisjes':target==='destination'?'Prek hartën për destinacionin':'Prek hartën për vendin')+' · Anulo ×';$('pick-hint').hidden=false;
}
$('pick-map').addEventListener('click',()=>{if(picking){stopPicking();return;}startPicking('place');});
$('pick-origin').addEventListener('click',()=>startPicking('origin'));
$('pick-destination').addEventListener('click',()=>startPicking('destination'));
$('pick-hint').addEventListener('click',()=>{const target=picking;stopPicking();if(target==='travel-origin'){if(detailStation)openStation(detailStation,stationFromList);}else if(target==='origin'||target==='destination')openSearch();});
function locationRecovery(error,requestMode){
 $('location-note').textContent=error.message+' Cakto '+(requestMode==='route'?'pikën e nisjes':'një vend')+' manualisht ose në hartë.';$('location-note').hidden=false;
 if(requestMode==='route'){$('origin-mode').value='manual';syncOrigin();}else chooseMode('place');
 const failure=Error(error.message);failure.locationRecovery=true;throw failure;
}
function updateDevicePosition(pos){
 try{deviceLocation=locationLayer?locationLayer.update(pos):locationFix(pos);gpsDenied=false;$('locate-me').title='Vendndodhja ime · saktësia '+(deviceLocation.accuracy===null?'e panjohur':'±'+Math.round(deviceLocation.accuracy)+' m');driving?.position();navigation?.position(deviceLocation);return deviceLocation.point;}catch{return null;}
}
function startLocationWatch(){
 if(locationWatch!==null||document.hidden||!navigator.geolocation?.watchPosition)return;
 locationWatch=navigator.geolocation.watchPosition(updateDevicePosition,error=>{if(error.code===1)gpsDenied=true;locationLayer?.unavailable();},{enableHighAccuracy:true,maximumAge:15000,timeout:30000});
}
function locate(signal,{maximumAge=60000}={}){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(Error('Vendndodhja nuk mbështetet. Përdor kërkimin sipas vendit.'));return;}
    if(!window.isSecureContext){reject(Error('Vendndodhja kërkon HTTPS. Përdor kërkimin sipas qytetit.'));return;}
    let settled=false;
    const finish=(callback,value)=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);callback(value);};
    const abort=()=>finish(reject,new DOMException('Kërkimi u anulua.','AbortError'));
    signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}
    navigator.geolocation.getCurrentPosition(pos=>{if(settled)return;const p=updateDevicePosition(pos);if(!p){finish(reject,Error('Koordinatat GPS nuk janë të vlefshme.'));return;}startLocationWatch();finish(resolve,p);},error=>{gpsDenied=true;locationLayer?.unavailable();finish(reject,Error(error.code===1?'Vendndodhja nuk u lejua. Lejoje në shfletues ose kërko sipas qytetit.':'Vendndodhja nuk u mor. Provo jashtë ose kërko sipas qytetit.'));},{enableHighAccuracy:true,timeout:20000,maximumAge});
  });
}
async function place(query,signal,title='Zgjidh vendin'){
  const p=coordinates(query);if(p)return p;
  let candidates=localPlaces(query);
  if(!candidates.length){
  const data=await json(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`,{signal,timeout:10000});
  candidates=(data.features??[]).flatMap(f=>{
    try{const c=f.geometry.coordinates,p=point(c[1],c[0]),t=f.properties;return [{point:p,label:[t.name,t.street,t.city,t.state,t.country].filter((v,i,a)=>v&&a.indexOf(v)===i).join(', ')}];}catch{return [];}
  });
  }
  if(!candidates.length)throw Error('Vendi nuk u gjet. Shto shtetin ose vendos koordinatat.');
  return new Promise((resolve,reject)=>{
    const dialog=$('place-dialog'),list=$('place-options');dialog.querySelector('h2').textContent=title;list.replaceChildren();let selected=false;
    const abort=()=>dialog.close();
    dialog.addEventListener('close',()=>{signal.removeEventListener('abort',abort);if(!selected)reject(new DOMException('Zgjedhja u anulua.','AbortError'));},{once:true});
    signal.addEventListener('abort',abort,{once:true});if(signal.aborted){reject(new DOMException('Kërkimi u anulua.','AbortError'));return;}
    for(const item of candidates){const b=text('button',item.label,'place-option');b.addEventListener('click',()=>{selected=true;dialog.close();resolve(item.point);});list.append(b);}
    dialog.showModal();
  });
}
async function route(start,end,signal){
  const path=`/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`;
  for(const base of ['https://router.project-osrm.org','https://routing.openstreetmap.de/routed-car']){
    try{
      const data=await json(base+path,{signal,timeout:12000});
      const r=data.routes?.[0];if(data.code!=='Ok'||!r?.geometry?.coordinates?.length||!Number.isFinite(r.distance)||r.distance<=0)continue;
      if(r.distance>1500000)throw Error('Versioni i parë mbështet itinerare deri në 1500 km. Kërko pjesë të rrugës.');
      return {line:r.geometry.coordinates.map(c=>point(c[1],c[0])),km:r.distance/1000,duration:Number.isFinite(r.duration)&&r.duration>0?r.duration:null};
    }catch(error){if(signal.aborted)throw error;if(error.message.includes('1500 km'))throw error;}
  }
  throw Error('Itinerari nuk u llogarit. Provo “Një vend” për të gjetur karikues pranë destinacionit.');
}
function setWeatherOpen(open){
 if(open){journeyTools?.close();closeStation();setTerrainOpen(false);showResults(false);}
 $('weather-panel').hidden=!open;document.body.classList.toggle('weather-open-state',open);$('weather-open').setAttribute('aria-expanded',String(open));
 if(!open)stopRadarAnimation();
}
function resetRouteWeather(){weatherController?.abort();weatherController=null;weatherState=null;if(weatherLayer&&map)map.removeLayer(weatherLayer);weatherLayer=null;setWeatherOpen(false);$('weather-rows').replaceChildren();$('route-alerts').replaceChildren();$('route-weather-alert').hidden=true;$('weather-summary').textContent='';$('weather-time-note').textContent='';$('weather-status').textContent='Zgjidh një vend ose krijo itinerar për motin.';}
function weatherPick(p,index){
 if(map)map.panTo([p.lat,p.lon],{animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});
 document.querySelectorAll('.weather-row').forEach((row,i)=>row.classList.toggle('weather-row-active',i===index));
}
function drawWeatherPins(points){
 if(weatherLayer&&map)map.removeLayer(weatherLayer);weatherLayer=null;
 if(!map||!$('weather-pins').checked)return;
 if(!map.getPane('weatherPins')){map.createPane('weatherPins');map.getPane('weatherPins').style.zIndex='590';}
 weatherLayer=L.layerGroup([],{attribution:'Moti: <a href="https://open-meteo.com/">Open-Meteo</a>'}).addTo(map);
 points.forEach((p,i)=>{
  const severity=p.advisories.some(a=>a.level==='high')?'high':p.advisories.length?'notice':'';
  const icon=L.divIcon({className:'weather-marker',html:`<span class="weather-map-pill ${severity}"><span>${p.kind.icon}</span><span>${p.temperature===null?'—':Math.round(p.temperature)+'°'}</span></span>`,iconSize:[65,32],iconAnchor:[-7,35]});
  L.marker([p.lat,p.lon],{icon,pane:'weatherPins',title:`${p.km.toFixed(0)} km · ${p.kind.name} · ${p.temperature===null?'Pa temperaturë':p.temperature+'°C'}`,keyboard:true}).addTo(weatherLayer).on('click',()=>{if(picking)return;setWeatherOpen(true);weatherPick(p,i);$('weather-rows').children[i]?.scrollIntoView({block:'nearest'});});
 });
}
function renderRouteWarnings(state,points=[]){
 const button=$('route-weather-alert'),list=$('route-alerts');list.replaceChildren();button.hidden=!state.line;if(!state.line)return;
 const hazards=points.map((p,i)=>({p,i})).filter(({p})=>p.advisories.length);
 button.classList.toggle('has-warning',hazards.length>0);button.classList.toggle('high',points.some(p=>p.advisories.some(a=>a.level==='high')));
 const unavailable=!points.some(p=>p.time!==null&&p.temperature!==null);
 button.textContent=state.loading?'☁ Duke kontrolluar motin në rrugë…':state.error||unavailable?'☁ Moti në rrugë: pa të dhëna · Rifresko':hazards.length?`△ ${hazards.length} pika me sinjale moti · ${hazards[0].p.km.toFixed(0)} km · ${hazards[0].p.advisories[0].label}`:'☁ Moti në rrugë · Pa sinjale në pikat e kontrolluara';
 button.title=button.textContent+' · Hap detajet';
 for(const {p,i} of hazards){const row=document.createElement('button');row.type='button';row.className='route-alert-item';const at=document.createElement('strong');at.textContent=`△ ${p.km===0?'Në nisje':p.km.toFixed(0)+' km nga nisja'} · rreth ${new Date(p.target).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})}`;const info=document.createElement('span');info.textContent=p.advisories.map(a=>a.label).join(' · ');row.append(at,info);row.addEventListener('click',()=>{weatherPick(p,i);$('weather-rows').children[i]?.scrollIntoView({block:'nearest',behavior:'smooth'});});list.append(row);}
}
$('route-weather-alert').addEventListener('click',()=>{setWeatherOpen(true);if(weatherState?.error)requestRouteWeather(weatherState,true);});
function renderRouteWeather(){
 const state=weatherState;if(!state)return;
 $('weather-title').textContent=state.line?'Moti gjatë udhëtimit':'Moti pranë vendit';$('weather-refresh').disabled=state.loading;
 $('weather-status').textContent=state.loading?'Duke marrë parashikimin…':state.error?state.error:`Open-Meteo · marrë më ${new Date(state.data.fetchedAt).toLocaleString('sq-AL')}${Date.now()-Date.parse(state.data.fetchedAt)>20*60000?' · të dhëna të vjetra, rifresko':''}`;
 if(state.loading||state.error){renderRouteWarnings(state);if(state.error){state.forecast=null;$('weather-rows').replaceChildren();$('weather-time-note').textContent='';if(weatherLayer&&map)map.removeLayer(weatherLayer);weatherLayer=null;}$('weather-summary').textContent=state.loading?'Parashikimi nuk e pengon kërkimin e karikuesve.':'Moti është i padisponueshëm. Rruga dhe karikuesit mbeten të përdorshëm.';return;}
 const arrival=$('weather-mode').value==='arrival',points=selectForecast(state.data,state.points,{departure:state.departure,duration:state.duration,arrival});state.forecast=points;
 $('weather-time-note').textContent=state.line&&arrival&&state.duration?`Nisja: ${new Date(state.departure).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})}. Ora në secilën pikë është e përafërt, pa ndalesa ose trafik aktual. Orët sipas telefonit.`:'Parashikim për orën e kërkimit, jo matje e drejtpërdrejtë. Orët sipas telefonit.';
 const known=points.filter(p=>p.temperature!==null).length,signals=points.filter(p=>p.advisories.length).length;
 $('weather-summary').textContent=`${known}/${points.length} pika me temperaturë · ${signals} pika me sinjale moti nga app-i. ${signals?'Hap pikat për detajet.':'Mungesa e sinjaleve nuk përjashton rreziqe.'} Jo alarme zyrtare.`;
 renderRouteWarnings(state,points);renderWeatherRows($('weather-rows'),points,weatherPick);drawWeatherPins(points);
}
function requestRouteWeather(state,force=false){
 weatherController?.abort();const controller=new AbortController();weatherController=controller;state.loading=true;state.error='';renderRouteWeather();
 fetchWeather(state.points,{signal:controller.signal,force}).then(data=>{if(controller.signal.aborted||weatherState!==state)return;state.data=data;state.loading=false;renderRouteWeather();}).catch(error=>{if(controller.signal.aborted||weatherState!==state)return;state.loading=false;state.error='Parashikimi nuk u mor. Provo “Rifresko”.';renderRouteWeather();});
}
function prepareRouteWeather(line,center,duration=null){
 try{weatherState={line,points:routeWeatherPoints(line,center),duration,departure:Date.now(),loading:true,data:null,error:''};requestRouteWeather(weatherState);}
 catch{weatherState=null;$('weather-status').textContent='Nuk u përgatitën pikat e motit për këtë rrugë.';}
}
function stopRadarAnimation(){clearInterval(radarTimer);radarTimer=null;$('radar-play').textContent='▶';$('radar-play').setAttribute('aria-label','Luaj animacionin e radarit');}
function radarPanes(){for(const [name,z] of [['radarCoverage',290],['radarRain',300]])if(!map.getPane(name)){map.createPane(name);map.getPane(name).style.zIndex=String(z);map.getPane(name).style.pointerEvents='none';}}
function removeRadar(){radarController?.abort();stopRadarAnimation();if(radarLayer&&map)map.removeLayer(radarLayer);if(radarCoverage&&map)map.removeLayer(radarCoverage);radarLayer=null;radarCoverage=null;document.body.classList.remove('radar-active');$('radar-controls').hidden=true;}
function showRadarFrame(index){
 if(!map||!radarData||!$('radar-toggle').checked)return;
 const frame=radarData.frames[index];if(!frame)return;radarPanes();$('radar-frame').value=String(index);
 const url=radarTile(radarData,index),opacity=Number($('radar-opacity').value)/100;
 if(radarLayer)radarLayer.setUrl(url);else{
  radarLayer=L.tileLayer(url,{pane:'radarRain',minZoom:2,maxZoom:19,maxNativeZoom:7,opacity,attribution:'Radar: <a href="https://www.rainviewer.com/">RainViewer</a>'}).addTo(map);
  radarLayer.on('tileerror',()=>{if($('radar-toggle').checked)$('radar-status').textContent='Disa pjesë të radarit nuk u ngarkuan. Mos e merr pamjen bosh si mungesë reshjesh.';});
 }
 if($('radar-coverage').checked&&!radarCoverage)radarCoverage=L.tileLayer(`${radarData.host}/v2/coverage/0/256/{z}/{x}/{y}/0/0_0.png`,{pane:'radarCoverage',maxNativeZoom:7,maxZoom:19,opacity:.22,interactive:false}).addTo(map);
 if(!$('radar-coverage').checked&&radarCoverage){map.removeLayer(radarCoverage);radarCoverage=null;}
 $('radar-status').textContent=`Pamja: ${new Date(frame.time*1000).toLocaleString('sq-AL')}${radarData.stale?' · pamje e vjetër':''}. Koha është e kornizës, jo e çdo matjeje. Mbulimi ndryshon sipas zonës.`;
 $('radar-controls').hidden=false;document.body.classList.add('radar-active');
}
async function enableRadar(force=false){
 if(!map){$('radar-toggle').checked=false;$('radar-status').textContent='Harta nuk u ngarkua; radari nuk mund të shfaqet.';return;}
 radarController?.abort();const controller=new AbortController();radarController=controller;stopRadarAnimation();$('radar-status').textContent='Duke marrë pamjet e radarit…';
 try{
  if(force||!radarData||Date.now()-radarFetchedAt>300000){const response=await json('https://api.rainviewer.com/public/weather-maps.json',{signal:controller.signal,timeout:10000});if(controller.signal.aborted)return;radarData=radarFrames(response);radarFetchedAt=Date.now();}
  if(controller.signal.aborted||!$('radar-toggle').checked)return;
  $('radar-frame').max=String(radarData.frames.length-1);showRadarFrame(radarData.frames.length-1);
 }catch(error){if(controller.signal.aborted)return;removeRadar();$('radar-toggle').checked=false;$('radar-status').textContent='Radari nuk u ngarkua. '+(error.message.includes('radar')?error.message:'Kontrollo internetin dhe provo përsëri.');}
}
$('weather-open').addEventListener('click',()=>{setWeatherOpen($('weather-panel').hidden);if(!weatherState)$('weather-status').textContent='Kërko një vend ose krijo itinerar për parashikimin. Radarin mund ta aktivizosh edhe tani.';});
$('weather-close').addEventListener('click',()=>setWeatherOpen(false));
$('weather-pins').addEventListener('change',()=>{if(weatherState?.forecast)drawWeatherPins(weatherState.forecast);});
$('weather-mode').addEventListener('change',()=>{if(weatherState?.data)renderRouteWeather();});
$('weather-refresh').addEventListener('click',()=>{if(weatherState){weatherState.departure=Date.now();requestRouteWeather(weatherState,true);}if($('radar-toggle').checked)enableRadar(true);});
$('radar-toggle').addEventListener('change',()=>{if($('radar-toggle').checked)enableRadar();else{removeRadar();$('radar-status').textContent='Radari është i çaktivizuar.';}});
$('radar-frame').addEventListener('input',()=>{stopRadarAnimation();showRadarFrame(Number($('radar-frame').value));});
$('radar-opacity').addEventListener('input',()=>radarLayer?.setOpacity(Number($('radar-opacity').value)/100));
$('radar-coverage').addEventListener('change',()=>showRadarFrame(Number($('radar-frame').value)));
$('radar-play').addEventListener('click',()=>{
 if(radarTimer){stopRadarAnimation();return;}if(!radarData||!$('radar-toggle').checked)return;
 $('radar-play').textContent='Ⅱ';$('radar-play').setAttribute('aria-label','Ndalo animacionin e radarit');radarTimer=setInterval(()=>showRadarFrame((Number($('radar-frame').value)+1)%radarData.frames.length),1000);
});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){stopRadarAnimation();if(locationWatch!==null){navigator.geolocation?.clearWatch?.(locationWatch);locationWatch=null;}}
 else{locationLayer?.refresh();if(deviceLocation&&!gpsDenied)startLocationWatch();}
});
setInterval(()=>locationLayer?.refresh(),30000);

function setTerrainOpen(open){
 if(open&&driving?.active)return;
 if(open&&!routeState)return;
 if(open){journeyTools?.close();setWeatherOpen(false);showResults(false);}
 $('terrain-panel').hidden=!open;document.body.classList.toggle('terrain-open-state',open);$('terrain-open').setAttribute('aria-expanded',String(open));
}
function resetTerrain(){
 resetRouteWeather();
 terrainController?.abort();terrainController=null;routeState=null;chartControl=null;
 if(terrainMarker&&map)map.removeLayer(terrainMarker);terrainMarker=null;
 setTerrainOpen(false);$('terrain-open').hidden=true;$('terrain-chart').replaceChildren();$('terrain-metrics').replaceChildren();
}
function markTerrain(p){
 if(!map)return;if(terrainMarker)map.removeLayer(terrainMarker);
 terrainMarker=L.circleMarker([p.lat,p.lon],{radius:6,color:'#183f34',weight:2,fillColor:'#fff',fillOpacity:1,interactive:false}).addTo(map);
}
function renderTerrain(){
 if(!routeState)return;const state=routeState,profile=state.terrain;$('terrain-open').hidden=false;$('terrain-retry').disabled=state.loading;
 $('terrain-status').textContent=state.loading?'Duke marrë lartësinë përgjatë rrugës…':profile?.coverage>0?`${Math.round(profile.coverage*100)}% e rrugës me lartësi · pika çdo rreth ${Math.round(profile.spacingKm*1000)} m · ${state.cached?'profil i ruajtur · ':''}${new Date(profile.fetchedAt).toLocaleString('sq-AL')}`:'Lartësia nuk u mor. Itinerari dhe karikuesit mbeten të përdorshëm; vija gri nuk jep vlerësim konsumi.';
 $('terrain-retry').hidden=state.loading||profile?.coverage===1;
 $('terrain-metrics').replaceChildren();
 for(const value of [`${state.km.toFixed(1)} km`,profile?.min!==null&&profile?.min!==undefined?`↑ ${Math.round(profile.ascent)} m`:'↑ — m',profile?.min!==null&&profile?.min!==undefined?`↓ ${Math.round(profile.descent)} m`:'↓ — m'])$('terrain-metrics').append(text('strong',value));
 $('terrain-sources').replaceChildren();
 if(profile){
  chartControl=renderProfile($('terrain-chart'),profile,markTerrain);
  for(const source of profile.sources||[]){const [label,url]=source==='open-meteo'?['Open-Meteo · Copernicus DEM GLO-90 · CC BY 4.0','https://open-meteo.com/en/docs/elevation-api']:['Open Topo Data · SRTM90m','https://www.opentopodata.org/datasets/srtm/'];$('terrain-sources').append(externalLink(label+' ↗',url),document.createTextNode(' '));}
  if(!profile.sources?.length)$('terrain-sources').append(text('span','Nuk u morën të dhëna lartësie nga burimet.'));
 }
}
function fetchTerrain(state){
 terrainController?.abort();const controller=new AbortController();terrainController=controller;state.loading=true;renderTerrain();
 loadTerrain(state.line,{signal:controller.signal}).then(profile=>{
  if(routeState!==state||controller.signal.aborted)return;state.terrain=profile;state.loading=false;state.cached=false;renderTerrain();
  if(state.historyId){searchHistory=searchHistory.map(e=>e.id===state.historyId?{...e,terrain:profile}:e);persistHistory();}
  if(!savedView)drawResults(state.line,state.center,true);
 }).catch(error=>{if(routeState!==state||controller.signal.aborted)return;state.loading=false;$('terrain-status').textContent='Profili nuk u ngarkua. Mund të provosh përsëri.';$('terrain-retry').hidden=false;$('terrain-retry').disabled=false;});
}
function prepareTerrain(line,km,center,cached=null){
 routeState={line,km,center,terrain:cached,loading:!cached,cached:Boolean(cached)};
 renderTerrain();setTerrainOpen(true);if(!cached)fetchTerrain(routeState);
}
$('terrain-open').addEventListener('click',()=>setTerrainOpen($('terrain-panel').hidden));
$('terrain-close').addEventListener('click',()=>setTerrainOpen(false));
$('terrain-retry').addEventListener('click',()=>{if(routeState)fetchTerrain(routeState);});
function persistHistory(){
 let reduced=false;
 while(searchHistory.length){try{localStorage.setItem('udhembare-history-v1',encodeHistory(searchHistory));if(reduced)toast('Hapësira në telefon është e kufizuar; u mbajtën kërkimet më të fundit.');return;}catch{if(searchHistory.length===1){toast('Historiku nuk u ruajt: shfletuesi nuk lejoi ruajtjen lokale.',true);return;}searchHistory.pop();reduced=true;}}
 try{localStorage.removeItem('udhembare-history-v1');}catch{}
}
function rememberSearch(entry){if(!cleanHistoryEntry(entry)){toast('Ky kërkim nuk mund të ruhej në historik.',true);return null;}searchHistory=addHistory(searchHistory,entry);persistHistory();return searchHistory[0]?.id;}
function renderHistory(){
 const list=$('history-list');list.replaceChildren();$('history-clear').disabled=!searchHistory.length;
 if(!searchHistory.length){list.append(text('p','Ende nuk ka kërkime ose itinerare të ruajtura.','empty-note'));return;}
 for(const entry of searchHistory){
  const row=document.createElement('article');row.className='history-item';const open=document.createElement('button');open.type='button';
  open.append(text('strong',historyLabel(entry)),text('small',`${entry.mode==='route'?'Itinerar · '+entry.routeKm.toFixed(1)+' km':entry.mode==='near'?'Kërkim pranë një vendi':'Kërkim sipas vendit'} · ${new Date(entry.at).toLocaleString('sq-AL')}${entry.terrain?.coverage>0?' · me profil lartësie':''}`));
  open.addEventListener('click',()=>{
   if(active)return;pendingReplay=entry;chooseMode(entry.mode);
   $('destination').value=entry.query||`${entry.center.lat},${entry.center.lon}`;
   if(entry.start){$('origin-mode').value='manual';$('origin').value=`${entry.start.lat},${entry.start.lon}`;syncOrigin();}
   $('route-order').value=entry.options.routeSort;$('radius').value=String(entry.options.radius);syncAlongRoute();$('power').value=String(entry.options.minPower);$('open-24').checked=entry.options.open24;$('connector').value=entry.options.connector;$('speed').value=entry.options.speed;$('unknown').checked=entry.options.includeUnknown;$('only-active').checked=entry.options.activeOnly;syncActive();
   $('history-dialog').close();$('search-form').requestSubmit();
  });
  const remove=text('button','×','delete-history');remove.type='button';remove.setAttribute('aria-label','Fshi: '+historyLabel(entry));remove.addEventListener('click',()=>{searchHistory=searchHistory.filter(e=>e.id!==entry.id);persistHistory();renderHistory();});row.append(open,remove);list.append(row);
 }
}
$('history-open').addEventListener('click',()=>{renderHistory();$('history-dialog').showModal();});
$('history-clear').addEventListener('click',()=>{searchHistory=[];persistHistory();renderHistory();});

function clearMap(){markers?.clearLayers();if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}if(radiusLayer){map.removeLayer(radiusLayer);radiusLayer=null;}}
function drawResults(line,center,preserve=false){
  if(!map)return;clearMap();if(!line&&terrainMarker){map.removeLayer(terrainMarker);terrainMarker=null;}
  if(line){
   routeLayer=L.layerGroup().addTo(map);
   const profile=routeState?.line===line?routeState.terrain:null;
   L.polyline(line.map(p=>[p.lat,p.lon]),{color:'#fff',weight:8,opacity:.9,interactive:false}).addTo(routeLayer);
   if(profile)for(const piece of coloredPieces(line,profile)){
    const info=`${piece.startKm.toFixed(1)}–${piece.endKm.toFixed(1)} km · ${piece.grade===null?'Pjerrësi e panjohur':piece.grade.toFixed(1)+'%'} · ${TERRAIN[piece.key].label}`;
    const part=L.polyline(piece.line.map(p=>[p.lat,p.lon]),{color:TERRAIN[piece.key].color,weight:5,opacity:.95,dashArray:piece.key==='unknown'?'5 7':null,className:'terrain-road terrain-'+piece.key}).addTo(routeLayer);
    part.bindPopup(text('p',info));part.on('click',()=>{setTerrainOpen(true);chartControl?.select(piece.index);});
   }else L.polyline(line.map(p=>[p.lat,p.lon]),{color:'#7f8790',weight:5,opacity:.9,className:'terrain-road terrain-unknown'}).addTo(routeLayer);
  }
  const points=[];
  stations.forEach((station,i)=>{const p=station.point;points.push([p.lat,p.lon]);
    const speed=station.speed||bestClass(station.connections||[]),label=`${i+1}. ${station.name} · ${speed.label} · ${currentOperating(station).label}`;
    const icon=L.divIcon({className:'numbered-marker',html:`<span class="map-marker speed-${speed.key} operating-${currentOperating(station).key}">${i+1}</span>`,iconSize:[34,34],iconAnchor:[17,17]});
    const marker=L.marker([p.lat,p.lon],{icon,title:label,alt:label,stationId:station.id}).addTo(markers);
    marker.getElement()?.classList.toggle('marker-selected',station.id===driving?.stationId);
    marker.on('click',()=>{if(!picking&&!active)openStation(station);});
  });
  if(center&&!line)radiusLayer=L.circle([center.lat,center.lon],{radius:viewingRadius*1000,color:'#5a8152',weight:1,dashArray:'5 6',fillColor:'#b0d471',fillOpacity:.035,interactive:false}).addTo(map);
  if(preserve)return;
  const focus=line?.[0]||center;if(focus)map.setView([focus.lat,focus.lon],line?13:14,{animate:false});
}
function favourite(station){return favourites.some(s=>s.id===station.id);}
function toggleSaved(station){
  if(favourite(station))favourites=favourites.filter(s=>s.id!==station.id);
  else{if(favourites.length>=200){toast('Mund të ruash deri në 200 karikues. Hiq ndonjërin për të shtuar të tjerë.');return;}favourites.push(station);}
  storage.set('udhembare-favourites',favourites);savedCount();
  if(savedView){stations=$('only-active').checked?workingOnly(favourites):[...favourites];shown=Math.min(stations.length,Math.max(shown,12));$('result-count').textContent=String(stations.length);drawResults(null,null);}
  renderCards();
}
function openShare(station){
  selectedStation=station;$('share-name').textContent=station.name;$('share-maps').href=destinationUrl(station);$('share-status').textContent='';
  document.querySelector('#share-dialog textarea')?.remove();
  $('share-native').disabled=!navigator.share;$('share-dialog').showModal();
  if(!navigator.share)$('share-status').textContent='Ky shfletues nuk ofron ndarjen. Kopjo lokacionin ose hape në Google Maps.';
}
$('share-native').addEventListener('click',async()=>{
  if(!selectedStation||!navigator.share)return;
  try{await navigator.share(shareData(selectedStation));$('share-status').textContent='Menuja e ndarjes u mbyll. Dërgimin dhe mbërritjen kontrolloji në myAudi dhe në veturë.';}
  catch(error){$('share-status').textContent=error.name==='AbortError'?'Ndarja u anulua.':'Ndarja nuk u hap. Provo kopjimin ose Google Maps.';}
});
$('copy-destination').addEventListener('click',async()=>{
  if(!selectedStation)return;const data=shareData(selectedStation),value=`${data.text}\n${data.url}`;
  try{await navigator.clipboard.writeText(value);$('share-status').textContent='Lokacioni u kopjua. Mund ta ndash ose ta kërkosh në myAudi.';}
  catch{document.querySelector('#share-dialog textarea')?.remove();const area=document.createElement('textarea');area.readOnly=true;area.value=value;area.setAttribute('aria-label','Lokacioni për kopjim');area.style.width='100%';$('share-dialog').append(area);area.focus();area.select();$('share-status').textContent='Kopjo tekstin e përzgjedhur manualisht.';}
});
function externalLink(label,url){const a=text('a',label);const safe=/^(?:tel:[+0-9]+|mailto:[^\s]+)$/i.test(String(url))?url:webUrl(url);if(safe)a.href=safe;else a.setAttribute('aria-disabled','true');a.target='_blank';a.rel='noopener noreferrer';return a;}
function providerPanel(station){
 const provider=station.info?.provider||{},section=document.createElement('section');section.className='provider-panel';section.setAttribute('aria-label','Operatori dhe aplikacionet');
 const identity=document.createElement('div');identity.className='provider-identity';
 const badge=text('span',(provider.name||station.operator||'EV').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(),'provider-logo-fallback');
 const logoBox=document.createElement('span');logoBox.className='provider-logo'+(provider.logoTheme==='dark'?' logo-dark':'');logoBox.append(badge);
 if(webUrl(provider.logo)){const img=document.createElement('img');img.alt='Logo · '+(provider.name||station.operator);img.src=webUrl(provider.logo);img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('load',()=>{badge.hidden=true;});img.addEventListener('error',()=>img.remove());logoBox.append(img);}
 const title=document.createElement('div');title.append(text('small','OPERATORI'),text('strong',provider.name||station.operator||'I paspecifikuar'));identity.append(logoBox,title);section.append(identity);
 const links=document.createElement('div');links.className='provider-links';
 for(const [label,url] of [['Faqja e operatorit ↗',provider.website],['Faqja e lokacionit ↗',provider.locationWebsite],[provider.appLabel||'Aplikacioni zyrtar ↗',provider.appPage],['Android · Google Play ↗',provider.android],['iOS · App Store ↗',provider.ios],['APK zyrtar · Android ↗',provider.apk]])if(webUrl(url))links.append(externalLink(label,webUrl(url)));
 if(links.childElementCount)section.append(links);else section.append(text('p','Ende nuk ka lidhje zyrtare të regjistruar për këtë operator.','field-note'));
 const phone=station.info?.phone||provider.phone,email=station.info?.email||provider.email;
 const contacts=document.createElement('div');contacts.className='provider-links';
 if(phone){const number=phone.replace(/[^+0-9]/g,'');if(number.replace(/\D/g,'').length>=6)contacts.append(externalLink((station.info?.phone?'Telefono: ':'Ndihma e operatorit: ')+phone,'tel:'+number));}
 if(email&&/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email))contacts.append(externalLink('Email ↗','mailto:'+encodeURIComponent(email)));
 if(contacts.childElementCount)section.append(contacts);
 if(provider.help)section.append(text('p',provider.help,'field-note'));
 if(provider.source){const source=externalLink('Burimi i informacionit të operatorit ↗',provider.source);source.className='provider-attribution';section.append(source);}
 return section;
}
function connectorPanel(station){
 const section=document.createElement('section');section.className='connector-panel';section.append(text('h4','Lidhësit në këtë lokacion'));
 const connections=station.allConnections||station.connections||[];
 if(!connections.length){section.append(text('p','Lloji, numri dhe fuqia e lidhësve nuk janë specifikuar.','field-note'));return section;}
 for(const c of connections){
  const row=document.createElement('div');row.className='connector-row';
  const kind=text('span',c.current||'EV','connector-current');
  const desc=document.createElement('div');desc.append(text('strong',c.label));
  const sub=[c.count?`${c.count} lidhës`:'Numri i panjohur',c.voltage?`${c.voltage} V`:'',c.amps?`${c.amps} A`:''].filter(Boolean);desc.append(text('small',sub.join(' · ')));
  row.append(kind,desc,text('strong',c.power?`${c.power} kW`:'— kW','connector-power'));section.append(row);
 }
 section.append(text('p','Fuqia maksimale e raportuar. Shpejtësia reale varet nga vetura dhe kushtet.','field-note'));return section;
}
function factsPanel(station){
 const section=document.createElement('dl');section.className='station-facts';
 const add=(label,value)=>{if(value){section.append(text('dt',label),text('dd',value));}};
 add('Tarifa e raportuar',station.price||'Nuk është publikuar në burim');add('Orari',station.hours||'I paspecifikuar');
 const access={yes:'Publike, sipas regjistrit',customers:'Për klientë / me kushte',members:'Kërkon anëtarësim',permissive:'Me lejen e pronarit',destination:'Për vizitorët e lokacionit'};
 add('Qasja',access[station.access]||station.access||'E paspecifikuar');
 add('Për Audi e-tron',station.unknown?'Duhet kontrolluar':station.compatible?'Ka CCS2 ose Type 2 në filtrat e zgjedhur':'Lidhësit e zgjedhur nuk përputhen');
 return section;
}

function locationDetails(station){
 const details=document.createElement('details');details.className='station-more';details.append(text('summary','Foto, qasja dhe burimet'));
 const body=document.createElement('div');body.className='station-more-body';const info=station.info||{},provider=info.provider||{};
 if(info.description)body.append(text('p',info.description));
 const metadata=info.metadata||{};
 for(const [label,value] of [['Udhëzime për hyrjen',metadata.accessNotes],['Kushtet e përdorimit',metadata.usage],['Parkimi',metadata.parking],['Shërbimet e lokacionit',metadata.facilities],['Karikim jashtë orarit',metadata.chargingWhenClosed===true?'Po':metadata.chargingWhenClosed===false?'Jo':''],['Kapacitet i raportuar',info.capacity],['Referenca e operatorit',metadata.reference],['Shënime',info.note]])if(value)body.append(text('h4',label),text('p',String(value)));
 if(info.attributes?.length){body.append(text('h4','Pajisjet dhe qasja'));const facts=document.createElement('dl');facts.className='station-facts';for(const [label,value] of info.attributes)facts.append(text('dt',label),text('dd',value));body.append(facts);}
 if(info.payments?.length)body.append(text('h4','Pagesa dhe autentikimi'),text('p',info.payments.join(' · ')));
 if(metadata.registryStatus)body.append(text('h4','Statusi në regjistrin historik'),text('p',metadata.registryStatus+(metadata.registryStatusAt?' · '+new Date(metadata.registryStatusAt).toLocaleDateString('sq-AL'):'')),text('p','Ky regjistrim nuk konfirmon disponueshmërinë aktuale.','field-note'));
 if(info.checkedAt)body.append(text('p','Kontrolli i shënuar në regjistër: '+info.checkedAt));
 body.append(text('p',`Koordinatat: ${station.point.lat.toFixed(6)}, ${station.point.lon.toFixed(6)}`));
 if(station.provenance?.length){body.append(text('h4','Burimet e këtij lokacioni'));for(const p of station.provenance){const row=document.createElement('p');row.append(externalLink(p.name+' ↗',p.url));if(p.license)row.append(document.createTextNode(' · '+p.license));if(p.fetchedAt)row.append(document.createTextNode(' · marrë më '+new Date(p.fetchedAt).toLocaleDateString('sq-AL')));body.append(row);}}
 if(station.sourceUpdatedAt)body.append(text('p','Përditësimi i raportuar nga burimi: '+station.sourceUpdatedAt));
 if(station.finesId)body.append(finesLiveSection(station.finesId));
 body.append(text('h4','Foto të lokacionit'),photoSection(station),text('h4','Vlerësime dhe pamje rruge'));
 const vlerësime=document.createElement('div');vlerësime.className='provider-links';vlerësime.append(externalLink('Kërko vlerësime dhe foto në Maps ↗',externalLocationUrl(station,'vlerësime')),externalLink('Pamje rruge në Maps ↗',externalLocationUrl(station,'streetview')));body.append(vlerësime,text('p','Vlerësime nuk importohen në këtë faqe. Kontrollo që lokacioni në Maps është i njëjti.','field-note'));
 details.append(body);return details;
}
function closeStation(restore=false){
 const wasOpen=!$('station-panel').hidden;let returnMarker=null;if(restore&&wasOpen)markers?.eachLayer(marker=>{if(marker.options.stationId===detailStation?.id)returnMarker=marker.getElement?.();});
 journeyTools?.closeStation();
 travelController?.abort();travelController=null;markers?.eachLayer(marker=>marker.getElement?.()?.classList.remove('marker-selected'));$('station-panel').hidden=true;document.body.classList.remove('station-open');
 if(restore&&wasOpen){if(stationFromList)showResults(true);(stationFromList?$('list-open'):returnMarker||$('list-open')).focus({preventScroll:true});}
}
function syncStationCondition(){
 if(!detailStation)return;const state=currentOperating(detailStation);$('station-condition').replaceChildren(text('span',state.label,'tag operating-status operating-'+state.key));
 if(state.key==='working')$('station-condition').append(text('span',`${state.available} / ${state.total} të përzgjedhur të lirë`,'tag'));
}
function syncStationSave(){if(!detailStation)return;const saved=favourite(detailStation);$('station-save').textContent=saved?'♥':'♡';$('station-save').setAttribute('aria-pressed',String(saved));$('station-save').setAttribute('aria-label',(saved?'Hiq nga të ruajturat: ':'Ruaj: ')+detailStation.name);}
function openStation(station,fromList=false){
 if(driving?.pick(station))return;
 journeyTools?.close();setWeatherOpen(false);closeStation();detailStation=station;stationFromList=fromList;showResults(false);setTerrainOpen(false);
 document.body.classList.add('station-open');$('station-panel').hidden=false;markers?.eachLayer(marker=>marker.getElement?.()?.classList.toggle('marker-selected',marker.options.stationId===station.id));
 if(map){map.setView([station.point.lat,station.point.lon],Math.max(16,map.getZoom()),{animate:false});const size=map.getSize();map.panBy(size.x>=760?[-Math.min(230,size.x*.2),0]:[0,size.y*.24],{animate:false});}
 $('station-title').textContent=station.name;$('station-address').textContent=station.address||'Adresa e paspecifikuar';syncStationSave();
 const profile=providerPanel(station),identity=profile.querySelector('.provider-identity');$('station-brand').replaceChildren(identity);
 const state=currentOperating(station);syncStationCondition();
 $('station-hours').replaceChildren(text('span','Orari'),text('strong',station.hours||'I paspecifikuar'));
 $('station-connectors').replaceChildren(connectorPanel(station));
 const extra=document.createElement('details');extra.className='station-extra';extra.append(text('summary','Operatori, foto dhe të gjitha detajet'));
 extra.append(profile,factsPanel(station),locationDetails(station));
 const source=text('p','Statusi: '+(state.observedAt?new Date(state.observedAt).toLocaleString('sq-AL'):state.reason),'field-note');extra.append(source);$('station-extra').replaceChildren(extra);
 $('station-actions').replaceChildren();const ownNav=text('button','Navigo në Udhëmbarë · 3D','primary');ownNav.type='button';ownNav.addEventListener('click',()=>navigation?.start(station.point,station.name));$('station-actions').append(ownNav);const share=text('button','Dërgo te Audi ↗','primary');share.addEventListener('click',()=>openShare(station));$('station-actions').append(share);
 const nav=document.createElement('div');nav.className='nav-links';for(const [target,label] of [['osmand','OsmAnd ↗'],['waze','Waze ↗']])nav.append(externalLink(label,navigationUrl(station,target)));$('station-actions').append(nav);const provider=station.info?.provider||{},official=webUrl(provider.appPage||provider.website);if(official){const link=externalLink('Karikimi / rezervimi te operatori ↗',official);link.className='operator-charge-link';$('station-actions').append(link);}
 $('station-title').focus({preventScroll:true});$('station-panel').querySelector('.station-sheet-scroll').scrollTop=0;
 $('station-smart').replaceChildren();if(journeyTools)$('station-smart').append(journeyTools.station(station));
 calculateStationTravel();
}
async function calculateStationTravel(forceGps=false){
 if(!detailStation)return;travelController?.abort();const controller=new AbortController();travelController=controller;const station=detailStation;
 $('travel-value').textContent='Duke llogaritur rrugën…';$('travel-note').textContent='';
 try{
  let origin,label;
  if(forceGps){origin=await locate(controller.signal);manualTravelOrigin=null;label='Nga vendndodhja ime';}
  else if(manualTravelOrigin){origin=manualTravelOrigin;label='Nga nisja manuale';}
  else if(deviceLocation&&Date.now()-deviceLocation.at<60000){origin=deviceLocation.point;label='Nga vendndodhja ime';}
  else if(gpsDenied&&lastSearch?.start){origin=lastSearch.start;label='Nga nisja e itinerarit';}
  else if(gpsDenied)throw Error('GPS-i nuk është i disponueshëm. Cakto nisjen për të marrë largësinë dhe kohën.');
  else{origin=await locate(controller.signal);label='Nga vendndodhja ime';}
  if(controller.signal.aborted||detailStation!==station)return;
  const data=await stationTravel(origin,station.point,{signal:controller.signal});if(controller.signal.aborted||detailStation!==station)return;
  const formatted=formatTravel(data);$('travel-value').textContent=`${formatted.distance} → ${formatted.duration}`;
  $('travel-note').textContent=`${label} · me veturë · OSRM · vlerësim pa trafik në kohë reale.`;
 }catch(error){if(controller.signal.aborted||detailStation!==station)return;$('travel-value').textContent='Koha e udhëtimit nuk u mor';$('travel-note').textContent=error.message||'Provo përsëri ose cakto nisjen manualisht.';}
}
$('station-close').addEventListener('click',()=>closeStation(true));
$('station-save').addEventListener('click',()=>{if(detailStation){toggleSaved(detailStation);syncStationSave();}});
$('travel-gps').addEventListener('click',()=>calculateStationTravel(true));
$('travel-manual').addEventListener('click',()=>{$('travel-origin-error').textContent='';$('travel-origin-dialog').showModal();$('travel-origin').focus();});
$('travel-origin-form').addEventListener('submit',async event=>{
 event.preventDefault();if(!detailStation)return;travelController?.abort();const controller=new AbortController();travelController=controller;
 const query=$('travel-origin').value.trim();if(!query)return;
 $('travel-origin-dialog').close();
 try{manualTravelOrigin=await place(query,controller.signal,'Zgjidh nisjen për stacionin');if(!controller.signal.aborted)calculateStationTravel();}
 catch(error){if(controller.signal.aborted)return;$('travel-origin-error').textContent=error.message||'Vendi nuk u gjet.';$('travel-origin-dialog').showModal();}
});
$('travel-pick').addEventListener('click',()=>{$('travel-origin-dialog').close();$('station-panel').hidden=true;document.body.classList.remove('station-open');startPicking('travel-origin');});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('station-panel').hidden&&!document.querySelector('dialog[open]'))closeStation(true);});

function renderCards(){
  const container=$('results');for(const dispose of miniMapDisposers)dispose();miniMapDisposers=[];container.replaceChildren();
  if(!stations.length){container.append(text('p',savedView?'Nuk ke ende karikues të ruajtur. Shtyp zemrën në një rezultat për ta ruajtur.':$('only-active').checked?'Nuk ka pika të konfirmuara në punë me këta filtra. Pikat pa status aktual nuk përfshihen.':'Nuk u gjetën karikues me këta filtra. Rrit rrezen, ul fuqinë minimale ose përfshi lidhës të paspecifikuar.','empty-note'));}
  stations.slice(0,shown).forEach((station,i)=>{
    const card=document.createElement('article');card.className='station-card';card.dataset.stationIndex=String(i);
    const preview=stationMap(station,()=>openStation(station,true),{root:$('results-panel')});miniMapDisposers.push(()=>preview.dispose());card.append(preview.element);
    const top=document.createElement('div');top.className='card-top';top.append(text('span',String(i+1),'station-number'));
    const save=text('button',favourite(station)?'♥':'♡',favourite(station)?'save saved':'save');save.setAttribute('aria-label',favourite(station)?`Hiq nga të ruajturat: ${station.name}`:`Ruaj: ${station.name}`);save.setAttribute('aria-pressed',String(favourite(station)));save.addEventListener('click',()=>toggleSaved(station));top.append(save);card.append(top,text('h3',station.name),text('p',station.address||'Adresa e paspecifikuar','station-address'));
    const tags=document.createElement('div');tags.className='station-tags';
    const speed=station.speed||bestClass(station.connections||[]),state=currentOperating(station);card.querySelector('.station-number').classList.add('category-'+speed.key);
    tags.append(text('span',station.power?`${station.power} kW`:'Fuqia e panjohur','tag'),text('span',speed.label,'tag category-'+speed.key),text('span',state.label,'tag operating-status operating-'+state.key));
    const routeDistance=station.routePosition!==null&&station.routePosition!==undefined?`${lastSearch?.routeSort==='near'?station.fromOrigin.toFixed(1)+' km nga nisja në vijë ajrore':'Rreth '+station.routePosition.toFixed(1)+' km përgjatë itinerarit'} · ${station.routeOffset<1?Math.round(station.routeOffset*1000)+' m':station.routeOffset.toFixed(1)+' km'} nga vija`:station.distance.toFixed(1)+' km në vijë ajrore';
    const summary=text('p',`${station.connectors} · ${savedView?'Vend i ruajtur':routeDistance}`,'compact-station-info');
    const open=text('button','Hap stacionin →','open-station');open.setAttribute('aria-label','Hap stacionin: '+station.name);open.addEventListener('click',()=>openStation(station,true));
    card.append(tags,summary,open);container.append(card);
  });
  $('load-more').hidden=shown>=stations.length;
  $('show-unconfirmed').hidden=savedView||!$('only-active').checked||stations.length>0;
}
function syncActive(){$('active-toggle').setAttribute('aria-pressed',String($('only-active').checked));}
function applyOperating(preserve=true){
 syncActive();if(!lastSearch||savedView)return;
 stations=$('only-active').checked?workingOnly(candidates):candidates;shown=Math.min(12,stations.length);
 const {requestMode,routeKm,line,center,fetchedAt}=lastSearch;
 $('results-title').textContent=lastSearch.replayed&&requestMode!=='route'?'Pranë vendit të ruajtur':$('only-active').checked?'Të konfirmuar në punë':requestMode==='route'?'Karikues përgjatë rrugës':requestMode==='place'?'Karikues pranë vendit':'Karikues pranë teje';
 $('results-eyebrow').textContent=requestMode==='route'?`ITINERAR ${routeKm.toFixed(0)} KM`:'NDALESA TË MUNDSHME';
 $('result-count').textContent=String(stations.length);$('result-count').hidden=false;
 const counts={working:0,offline:0,unknown:0};for(const s of candidates)counts[currentOperating(s).key]++;
 toast(`${lastSearch.offline?'KOPJE OFFLINE · statusi kërkon internet. ':''}${counts.working} në punë · ${counts.offline} jashtë shërbimit · ${counts.unknown} të pakonfirmuar. ${fetchedAt?'Regjistri u shkarkua më '+new Date(fetchedAt).toLocaleDateString('sq-AL')+'. ':''}Status aktual nga Fines, kur ofrohet. Në punë mund të jetë edhe i zënë. ${requestMode==='route'?'Renditur sipas filtrit të itinerarit. Kilometrat përgjatë rrugës janë deri te pika më e afërt në vijën e saj; largësia anësore nuk është devijimi real.':'Distanca në vijë ajrore.'}`);
 document.body.classList.add('has-results');renderCards();drawResults(line,center,preserve);journeyTools?.refresh();driving?.refresh();navigation?.refresh();
}
function changeActive(){
 syncActive();const options=storage.get('udhembare-settings-v2',{});storage.set('udhembare-settings-v2',{...options,activeOnly:$('only-active').checked});
 applyOperating();
}
$('active-toggle').addEventListener('click',()=>{if(active)return;$('only-active').checked=!$('only-active').checked;changeActive();if(!lastSearch||savedView){savedView=false;$('search-form').requestSubmit();}});
$('only-active').addEventListener('change',changeActive);
$('show-unconfirmed').addEventListener('click',()=>{$('only-active').checked=false;changeActive();});
let operatingSignature='';
function expireOperating(){
 if(detailStation&&!$('station-panel').hidden)syncStationCondition();
 const signature=candidates.map(s=>currentOperating(s).key).join(',');
 if(signature!==operatingSignature){operatingSignature=signature;if(!active){if(savedView){stations=$('only-active').checked?workingOnly(favourites):[...favourites];$('result-count').textContent=String(stations.length);renderCards();drawResults(null,null,true);}else applyOperating();}}
}
setInterval(expireOperating,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)expireOperating();});
$('load-more').addEventListener('click',()=>{shown=Math.min(stations.length,shown+12);renderCards();});
$('saved-open').addEventListener('click',()=>{
  setTerrainOpen(false);$('terrain-open').hidden=true;
  closeStation();savedView=true;stations=$('only-active').checked?workingOnly(favourites):[...favourites];shown=Math.min(12,stations.length);$('results-title').textContent='Karikuesit e tu';$('results-eyebrow').textContent='TË RUAJTURAT';$('result-count').textContent=String(stations.length);$('result-count').hidden=false;
  toast('Të ruajtura në këtë shfletues. Tarifat dhe detajet mund të jenë vjetruar; distancat nuk rillogariten.');renderCards();drawResults(null,null);showResults(true);
});
$('cancel').addEventListener('click',()=>{resetTerrain();active?.abort();active=null;busy(false);$('results-title').textContent='Kërkimi u anulua';toast('Mund të nisësh një kërkim të ri.');});
$('search-form').addEventListener('submit',async event=>{
  event.preventDefault();if(active)return;const replay=pendingReplay;pendingReplay=null;
  let options;try{options=settings({radius:$('radius').value,minPower:$('power').value,connector:$('connector').value,speed:$('speed').value,routeSort:$('route-order').value,activeOnly:$('only-active').checked,open24:$('open-24').checked,includeUnknown:$('unknown').checked});}catch(error){toast(error.message,true);return;}
  const originQuery=$('origin').value.trim();
  if(mode==='route'&&$('origin-mode').value==='manual'&&!originQuery){toast('Vendos nisjen ose zgjidhe në hartë.',true);$('origin').focus();return;}
  const query=$('destination').value.trim();if(mode!=='near'&&!query){toast('Vendos një qytet, adresë ose koordinata.',true);return;}
  storage.set('udhembare-origin',originQuery);storage.set('udhembare-origin-mode',$('origin-mode').value);
  $('location-note').hidden=true;
  storage.set('udhembare-settings-v2',options);if(query)storage.set('udhembare-query',query);
  if($('search-dialog').open)$('search-dialog').close();showResults(false);viewingRadius=options.radius;
  $('radius-badge').textContent=options.radius<1?`${Math.round(options.radius*1000)} m`:`${options.radius} km`;$('filter-badge').textContent=options.connector==='all'?'Të gjithë':options.connector==='both'?'Për Audi':options.connector;
  closeStation();manualTravelOrigin=null;resetTerrain();const controller=new AbortController();active=controller;busy(true);savedView=false;lastSearch=null;candidates=[];stations=[];shown=0;clearMap();$('results').replaceChildren();$('load-more').hidden=true;$('result-count').hidden=true;$('results-title').textContent='Duke gjetur ndalesën tënde…';
  const requestMode=mode;
  try{
    let center,start=null,line=null,routeKm=null,routeDuration=null;
    if(replay)center=replay.center;
    else if(requestMode==='near'){toast('Duke marrë vendndodhjen…');try{center=await locate(controller.signal);}catch(error){if(controller.signal.aborted)throw error;locationRecovery(error,requestMode);}}
    else{toast('Duke kërkuar destinacionin…');center=await place(query,controller.signal);}
    if(requestMode==='route'){
     toast('Duke marrë pikën e nisjes dhe itinerarin…');
     if(replay)start=replay.start;
     else if($('origin-mode').value==='manual'){toast('Duke kërkuar pikën e nisjes…');start=await place(originQuery,controller.signal,'Zgjidh pikën e nisjes');}
     else try{start=await locate(controller.signal);}catch(error){if(controller.signal.aborted)throw error;locationRecovery(error,requestMode);}
     const r=replay?.line?{line:replay.line,km:replay.routeKm,duration:replay.routeDuration}:await route(start,center,controller.signal);line=r.line;routeKm=r.km;routeDuration=r.duration;
     if(controller.signal.aborted)return;prepareTerrain(line,routeKm,center,replay?.terrain);
    }
    if(controller.signal.aborted)return;prepareRouteWeather(line,center,routeDuration);
    const historyId=rememberSearch({mode:requestMode,query:requestMode==='near'?'':replay?.query||query,origin:requestMode==='route'?(replay?.origin||($('origin-mode').value==='manual'?originQuery:`${start.lat.toFixed(4)}, ${start.lon.toFixed(4)}`)):'',center,start,line,routeKm,routeDuration,options,terrain:routeState?.terrain});
    if(routeState)routeState.historyId=historyId;

    if(controller.signal.aborted)return;
    toast('Duke ngarkuar regjistrin e karikuesve…');const data=await loadCharging(bounds(line??[center],options.radius),controller.signal);
    if(active!==controller)return;
    toast('Duke kontrolluar statusin te operatorët që ofrojnë të dhëna aktuale…');
    await providerReady;
    if(active!==controller)return;
    const checked=await checkOperating(parseStations(data,options,center,line,start),{signal:controller.signal,minPower:options.minPower});
    if(active!==controller)return;
    candidates=checked;lastSearch={line,center,start,requestMode,routeKm,routeDuration,routeSort:options.routeSort,fetchedAt:data.fetchedAt,offline:Boolean(data.offline),replayed:Boolean(replay)};
    const fresh=new Map(candidates.map(s=>[s.id,s]));
    if(favourites.some(s=>fresh.has(s.id))){favourites=favourites.map(s=>fresh.get(s.id)||s);storage.set('udhembare-favourites',favourites);}
    applyOperating(false);

  }catch(error){
    if(active!==controller)return;
    if(error.locationRecovery){if(driving?.active)driving.exit();openSearch();queueMicrotask(()=>$(requestMode==='route'?'origin':'destination').focus());}
    $('results-title').textContent=error.locationRecovery?'Cakto lokacionin manualisht':'Provo një kërkim tjetër';
    toast(error.name==='AbortError'?'Kërkimi u anulua.':error.name==='TimeoutError'?'Shërbimi vonoi përgjigjen. Provo përsëri.':error.message||'Kërkimi dështoi. Kontrollo internetin dhe provo përsëri.',error.name!=='AbortError');
  }finally{if(active===controller){active=null;busy(false);if(!map)$('pick-map').disabled=true;journeyTools?.refresh();navigation?.refresh();}}
});
journeyTools=createJourneyTools({map,L:window.L,getContext:()=>({search:lastSearch,candidates,stations,terrain:routeState?.terrain,weather:weatherState?.forecast,activeOnly:$('only-active').checked,radius:Number($('radius').value),busy:Boolean(active)}),openStation,notice:toast,
 closePanels:()=>{closeStation();showResults(false);setTerrainOpen(false);setWeatherOpen(false);},
 openArea:p=>{if(active)return;chooseMode('place');$('destination').value=`${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;$('radius').value='10';$('search-form').requestSubmit();},
 fitAll:()=>{if(!map)return;journeyTools?.close();closeStation();showResults(false);setTerrainOpen(false);setWeatherOpen(false);if(lastSearch?.line)map.fitBounds(L.latLngBounds(lastSearch.line.map(p=>[p.lat,p.lon])),{padding:[35,120],maxZoom:15});else if(radiusLayer)map.fitBounds(radiusLayer.getBounds(),{padding:[35,120],maxZoom:15});},
 filterReset:()=>{$('connector').value='all';$('power').value='0';$('speed').value='all';$('radius').value='10';$('unknown').checked=true;$('only-active').checked=false;$('open-24').checked=false;syncActive();$('search-form').requestSubmit();}
});
journeyTools.refresh();
createKeyVaultUI();
createInterface({notify:toast,closePanels:()=>{journeyTools.close();closeStation();showResults(false);setWeatherOpen(false);setTerrainOpen(false);}});
driving=createDriving({context:()=>({candidates,search:lastSearch,location:gpsDenied?null:deviceLocation,busy:Boolean(active),error:$('status').classList.contains('error')?$('status').textContent:''}),
 closePanels:()=>{stopPicking();journeyTools.close();closeStation();showResults(false);setWeatherOpen(false);setTerrainOpen(false);},
 search:kind=>{if(active)return;chooseMode('near');$('radius').value='10';$('connector').value=kind==='fast'?'CCS2':'both';$('power').value=kind==='fast'?'50':'0';$('speed').value='all';$('unknown').checked=false;$('only-active').checked=false;$('open-24').checked=false;syncActive();$('search-form').requestSubmit();},
 setupRoute:()=>{chooseMode('route');openSearch();$('destination').focus();},
 focusLocation:()=>{if(map&&!gpsDenied&&deviceLocation&&Date.now()-deviceLocation.at<30000)map.setView([deviceLocation.point.lat,deviceLocation.point.lon],Math.max(14,map.getZoom()),{animate:false});},
 focusStation:station=>{if(!map)return;markers?.eachLayer(marker=>marker.getElement?.()?.classList.toggle('marker-selected',marker.options.stationId===station.id));map.setView([station.point.lat,station.point.lon],15,{animate:false});map.panBy([0,map.getSize().y*.14],{animate:false});},
 share:openShare,notice:toast,navigate:station=>navigation?.start(station.point,station.name)});
navigation=createNavigation({context:()=>({search:lastSearch,location:gpsDenied?null:deviceLocation,busy:Boolean(active)}),getFix:async signal=>{await locate(signal,{maximumAge:0});return deviceLocation;},closePanels:()=>{if(driving?.active)driving.exit();journeyTools.close();closeStation();showResults(false);setTerrainOpen(false);setWeatherOpen(false);}});
$('navigate-route').addEventListener('click',()=>navigation.route());$('terrain-navigate').addEventListener('click',()=>navigation.route());navigation.refresh();
if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Open directly around the current location. Browsers ask for location permission if needed.
queueMicrotask(()=>{if(driving?.active)$('drive-near').click();else $('search-form').requestSubmit();});
