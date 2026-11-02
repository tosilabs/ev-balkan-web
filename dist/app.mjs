import {point,coordinates,distance,bounds,settings,parseStations,validStationId,destinationUrl,shareData,navigationUrl} from './core.mjs?v=1.8';
import {localPlaces} from './cities.mjs?v=1.8';
import {requestJson as json,loadCharging} from './services.mjs?v=1.8';
import {externalLocationUrl,bestClass,webUrl,setProviderCatalog} from './details.mjs?v=1.8';
import {photoSection} from './photos.mjs?v=1.8';
import {finesLiveSection,showSources} from './sources-ui.mjs?v=1.8';
import {checkOperating,currentOperating,workingOnly} from './operating.mjs?v=1.8';
import {loadTerrain,coloredPieces,TERRAIN} from './terrain.mjs?v=1.8';
import {renderProfile} from './terrain-ui.mjs?v=1.8';
import {cleanHistory,cleanHistoryEntry,addHistory,encodeHistory,historyLabel} from './history.mjs?v=1.8';
import {stationTravel,formatTravel} from './travel.mjs?v=1.8';
import {initBasemap} from './basemap.mjs?v=1.8';
let detailStation=null,stationFromList=false,travelController=null,manualTravelOrigin=null,deviceLocation=null,gpsDenied=false;
let candidates=[],lastSearch=null,routeState=null,terrainController=null,terrainMarker=null,chartControl=null,pendingReplay=null;
const $=id=>document.getElementById(id);
const providerReady=json(new URL('./data/providers.json',import.meta.url).href,{timeout:4000}).catch(()=>json(new URL('./providers.json',import.meta.url).href,{timeout:4000})).then(setProviderCatalog).catch(()=>{});
const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{toast('Telefoni nuk lejoi ruajtjen lokale. Kërkimi mbetet i përdorshëm.');}}};
let mode='near',active=null,stations=[],shown=0,savedView=false,selectedStation=null,map=null,markers=null,routeLayer=null,searchMarker=null,picking=false,radiusLayer=null,viewingRadius=10,originMarker=null;
let searchHistory=cleanHistory(storage.get('evb-history-v1',[]));
let favourites=storage.get('evb-favourites',[]);
if(!Array.isArray(favourites))favourites=[];
favourites=favourites.filter(s=>{try{return s&&typeof s.id==='string'&&validStationId(s.id)&&typeof s.name==='string'&&point(s.point.lat,s.point.lon)&&Number.isFinite(s.distance);}catch{return false;}}).slice(0,200);
let restored;
try{restored=settings(storage.get('evb-settings-v2',{radius:10,minPower:0,connector:'all',includeUnknown:true}));}catch{restored=settings({radius:10,minPower:0,connector:'all',includeUnknown:true});}
$('radius').value=String(restored.radius);if(!$('radius').value)$('radius').value='10';
$('power').value=String(restored.minPower);if(!$('power').value)$('power').value='0';
$('connector').value=restored.connector;$('speed').value=restored.speed;$('unknown').checked=restored.includeUnknown;
$('only-active').checked=restored.activeOnly;syncActive();
$('origin').value=String(storage.get('evb-origin','')).slice(0,300);
$('origin-mode').value=storage.get('evb-origin-mode','gps')==='manual'?'manual':'gps';
syncOrigin();
$('destination').value=String(storage.get('evb-query','')).slice(0,300);
function text(tag,value,className){const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node;}
function toast(message,error=false){$('status').textContent=message;$('status').title=message;$('results-note').textContent=message;$('status').classList.toggle('error',error);}
function showResults(open=true){if(open){closeStation();setTerrainOpen(false);}$('results-panel').hidden=!open;document.body.classList.toggle('results-open',open);$('list-open').setAttribute('aria-expanded',String(open));}
function openSearch(){closeStation();setTerrainOpen(false);showResults(false);$('search-dialog').showModal();}
$('search-open').addEventListener('click',openSearch);
$('filters-open').addEventListener('click',openSearch);
$('list-open').addEventListener('click',()=>showResults($('results-panel').hidden));
$('results-close').addEventListener('click',()=>showResults(false));
$('status').addEventListener('click',()=>showResults(true));
$('locate-me').addEventListener('click',()=>{if(active)return;chooseMode('near');showResults(false);$('radius').value='10';$('search-form').requestSubmit();});
function busy(value){document.body.classList.toggle('busy',value);$('cancel').hidden=!value;
  document.querySelectorAll('#search-form input,#search-form select,#search-form button[type=submit],.tabs button,#saved-open,#pick-map,#locate-me,#filters-open,#search-open,#active-toggle,#history-open').forEach(el=>el.disabled=value);
}
function chooseMode(value){
  mode=value;syncOrigin();$('pick-destination').hidden=value==='near';$('place-field').hidden=value==='near';$('destination').required=value!=='near';
  $('mode-description').textContent=value==='near'?'Karikuesit më të afërt me vendndodhjen tënde.':value==='route'?'Vendos destinacionin dhe gjej karikues pranë itinerarit.':'Kërko karikues pranë një qyteti, adrese ose pike në hartë.';
  $('origin-field').hidden=value!=='route';
  $('radius-label').textContent=value==='route'?'KORRIDORI':'RREZJA';
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
  map=L.map('map',{scrollWheelZoom:true,minZoom:2,maxZoom:19}).setView([41.9981,21.4254],11);
  initBasemap(map,L);
  markers=L.layerGroup().addTo(map);
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
function locate(signal){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(Error('Vendndodhja nuk mbështetet. Përdor kërkimin sipas vendit.'));return;}
    if(!window.isSecureContext){reject(Error('Vendndodhja kërkon HTTPS. Përdor kërkimin sipas qytetit.'));return;}
    let settled=false;
    const finish=(callback,value)=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);callback(value);};
    const abort=()=>finish(reject,new DOMException('Kërkimi u anulua.','AbortError'));
    signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}
    navigator.geolocation.getCurrentPosition(pos=>{if(settled)return;const p=point(pos.coords.latitude,pos.coords.longitude);gpsDenied=false;deviceLocation={point:p,at:Date.now()};finish(resolve,p);},error=>{gpsDenied=true;finish(reject,Error(error.code===1?'Vendndodhja nuk u lejua. Lejoje në shfletues ose kërko sipas qytetit.':'Vendndodhja nuk u mor. Provo jashtë ose kërko sipas qytetit.'));},{enableHighAccuracy:true,timeout:20000,maximumAge:60000});
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
      return {line:r.geometry.coordinates.map(c=>point(c[1],c[0])),km:r.distance/1000};
    }catch(error){if(signal.aborted)throw error;if(error.message.includes('1500 km'))throw error;}
  }
  throw Error('Itinerari nuk u llogarit. Provo “Një vend” për të gjetur karikues pranë destinacionit.');
}
function setTerrainOpen(open){
 if(open&&!routeState)return;
 if(open)showResults(false);
 $('terrain-panel').hidden=!open;document.body.classList.toggle('terrain-open-state',open);$('terrain-open').setAttribute('aria-expanded',String(open));
}
function resetTerrain(){
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
 while(searchHistory.length){try{localStorage.setItem('evb-history-v1',encodeHistory(searchHistory));if(reduced)toast('Hapësira në telefon është e kufizuar; u mbajtën kërkimet më të fundit.');return;}catch{if(searchHistory.length===1){toast('Historiku nuk u ruajt: shfletuesi nuk lejoi ruajtjen lokale.',true);return;}searchHistory.pop();reduced=true;}}
 try{localStorage.removeItem('evb-history-v1');}catch{}
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
   $('radius').value=String(entry.options.radius);$('power').value=String(entry.options.minPower);$('connector').value=entry.options.connector;$('speed').value=entry.options.speed;$('unknown').checked=entry.options.includeUnknown;$('only-active').checked=entry.options.activeOnly;syncActive();
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
    marker.on('click',()=>{if(!picking&&!active)openStation(station);});
  });
  if(center&&!line)radiusLayer=L.circle([center.lat,center.lon],{radius:viewingRadius*1000,color:'#5a8152',weight:1,dashArray:'5 6',fillColor:'#b0d471',fillOpacity:.035,interactive:false}).addTo(map);
  if(preserve)return;
  if(line?.length)map.fitBounds(L.latLngBounds(line.map(p=>[p.lat,p.lon])),{padding:[28,28]});
  else if(radiusLayer)map.fitBounds(radiusLayer.getBounds(),{paddingTopLeft:[35,140],paddingBottomRight:[35,150]});
  else if(points.length)map.fitBounds(L.latLngBounds(points),{padding:[45,45],maxZoom:13});
}
function favourite(station){return favourites.some(s=>s.id===station.id);}
function toggleSaved(station){
  if(favourite(station))favourites=favourites.filter(s=>s.id!==station.id);
  else{if(favourites.length>=200){toast('Mund të ruash deri në 200 karikues. Hiq ndonjërin për të shtuar të tjerë.');return;}favourites.push(station);}
  storage.set('evb-favourites',favourites);savedCount();
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
function externalLink(label,url){const a=text('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
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
 body.append(text('h4','Foto të lokacionit'),photoSection(station),text('h4','Reviews dhe pamje rruge'));
 const reviews=document.createElement('div');reviews.className='provider-links';reviews.append(externalLink('Kërko reviews dhe foto në Maps ↗',externalLocationUrl(station,'reviews')),externalLink('Pamje rruge në Maps ↗',externalLocationUrl(station,'streetview')));body.append(reviews,text('p','Reviews nuk importohen në këtë faqe. Kontrollo që lokacioni në Maps është i njëjti.','field-note'));
 details.append(body);return details;
}
function closeStation(restore=false){
 travelController?.abort();travelController=null;markers?.eachLayer(marker=>marker.getElement?.()?.classList.remove('marker-selected'));$('station-panel').hidden=true;document.body.classList.remove('station-open');
 if(restore&&stationFromList)showResults(true);
}
function syncStationSave(){if(!detailStation)return;const saved=favourite(detailStation);$('station-save').textContent=saved?'♥':'♡';$('station-save').setAttribute('aria-pressed',String(saved));$('station-save').setAttribute('aria-label',(saved?'Hiq nga të ruajturat: ':'Ruaj: ')+detailStation.name);}
function openStation(station,fromList=false){
 closeStation();detailStation=station;stationFromList=fromList;showResults(false);setTerrainOpen(false);
 document.body.classList.add('station-open');$('station-panel').hidden=false;markers?.eachLayer(marker=>marker.getElement?.()?.classList.toggle('marker-selected',marker.options.stationId===station.id));
 $('station-title').textContent=station.name;$('station-address').textContent=station.address||'Adresa e paspecifikuar';syncStationSave();
 const profile=providerPanel(station),identity=profile.querySelector('.provider-identity');$('station-brand').replaceChildren(identity);
 const state=currentOperating(station);$('station-condition').replaceChildren(text('span',state.label,'tag operating-status operating-'+state.key));
 if(state.key==='working')$('station-condition').append(text('span',`${state.available} / ${state.total} të përzgjedhur të lirë`,'tag'));
 $('station-hours').replaceChildren(text('span','Orari'),text('strong',station.hours||'I paspecifikuar'));
 $('station-connectors').replaceChildren(connectorPanel(station));
 const extra=document.createElement('details');extra.className='station-extra';extra.append(text('summary','Operatori, foto dhe të gjitha detajet'));
 extra.append(profile,factsPanel(station),locationDetails(station));
 const source=text('p','Statusi: '+(state.observedAt?new Date(state.observedAt).toLocaleString('sq-AL'):state.reason),'field-note');extra.append(source);$('station-extra').replaceChildren(extra);
 $('station-actions').replaceChildren();const share=text('button','Dërgo te Audi ↗','primary');share.addEventListener('click',()=>openShare(station));$('station-actions').append(share);
 const nav=document.createElement('div');nav.className='nav-links';for(const [target,label] of [['osmand','OsmAnd ↗'],['waze','Waze ↗']])nav.append(externalLink(label,navigationUrl(station,target)));$('station-actions').append(nav);
 $('station-title').focus({preventScroll:true});$('station-panel').querySelector('.station-sheet-scroll').scrollTop=0;
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
  const container=$('results');container.replaceChildren();
  if(!stations.length){container.append(text('p',savedView?'Nuk ke ende karikues të ruajtur. Shtyp zemrën në një rezultat për ta ruajtur.':$('only-active').checked?'Nuk ka pika të konfirmuara në punë me këta filtra. Pikat pa status aktual nuk përfshihen.':'Nuk u gjetën karikues me këta filtra. Rrit rrezen, ul fuqinë minimale ose përfshi lidhës të paspecifikuar.','empty-note'));}
  stations.slice(0,shown).forEach((station,i)=>{
    const card=document.createElement('article');card.className='station-card';card.dataset.stationIndex=String(i);
    const top=document.createElement('div');top.className='card-top';top.append(text('span',String(i+1),'station-number'));
    const save=text('button',favourite(station)?'♥':'♡',favourite(station)?'save saved':'save');save.setAttribute('aria-label',favourite(station)?`Hiq nga të ruajturat: ${station.name}`:`Ruaj: ${station.name}`);save.setAttribute('aria-pressed',String(favourite(station)));save.addEventListener('click',()=>toggleSaved(station));top.append(save);card.append(top,text('h3',station.name),text('p',station.address||'Adresa e paspecifikuar','station-address'));
    const tags=document.createElement('div');tags.className='station-tags';
    const speed=station.speed||bestClass(station.connections||[]),state=currentOperating(station);card.querySelector('.station-number').classList.add('category-'+speed.key);
    tags.append(text('span',station.power?`${station.power} kW`:'Fuqia e panjohur','tag'),text('span',speed.label,'tag category-'+speed.key),text('span',state.label,'tag operating-status operating-'+state.key));
    const summary=text('p',`${station.connectors} · ${savedView?'Vend i ruajtur':station.distance.toFixed(1)+' km në vijë ajrore'}`,'compact-station-info');
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
 toast(`${counts.working} në punë · ${counts.offline} jashtë shërbimit · ${counts.unknown} të pakonfirmuar. ${fetchedAt?'Regjistri u shkarkua më '+new Date(fetchedAt).toLocaleDateString('sq-AL')+'. ':''}Status aktual nga Fines, kur ofrohet. Në punë mund të jetë edhe i zënë. ${requestMode==='route'?'Distanca nga vija e itinerarit, jo devijimi rrugor.':'Distanca në vijë ajrore.'}`);
 document.body.classList.add('has-results');renderCards();drawResults(line,center,preserve);
}
function changeActive(){
 syncActive();const options=storage.get('evb-settings-v2',{});storage.set('evb-settings-v2',{...options,activeOnly:$('only-active').checked});
 applyOperating();
}
$('active-toggle').addEventListener('click',()=>{if(active)return;$('only-active').checked=!$('only-active').checked;changeActive();if(!lastSearch||savedView){savedView=false;$('search-form').requestSubmit();}});
$('only-active').addEventListener('change',changeActive);
$('show-unconfirmed').addEventListener('click',()=>{$('only-active').checked=false;changeActive();});
let operatingSignature='';
function expireOperating(){
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
  let options;try{options=settings({radius:$('radius').value,minPower:$('power').value,connector:$('connector').value,speed:$('speed').value,activeOnly:$('only-active').checked,includeUnknown:$('unknown').checked});}catch(error){toast(error.message,true);return;}
  const originQuery=$('origin').value.trim();
  if(mode==='route'&&$('origin-mode').value==='manual'&&!originQuery){toast('Vendos nisjen ose zgjidhe në hartë.',true);$('origin').focus();return;}
  const query=$('destination').value.trim();if(mode!=='near'&&!query){toast('Vendos një qytet, adresë ose koordinata.',true);return;}
  storage.set('evb-origin',originQuery);storage.set('evb-origin-mode',$('origin-mode').value);
  $('location-note').hidden=true;
  storage.set('evb-settings-v2',options);if(query)storage.set('evb-query',query);
  if($('search-dialog').open)$('search-dialog').close();showResults(false);viewingRadius=options.radius;
  $('radius-badge').textContent=`${options.radius} km`;$('filter-badge').textContent=options.connector==='all'?'Të gjithë':options.connector==='both'?'Për Audi':options.connector;
  closeStation();manualTravelOrigin=null;resetTerrain();const controller=new AbortController();active=controller;busy(true);savedView=false;lastSearch=null;candidates=[];stations=[];shown=0;clearMap();$('results').replaceChildren();$('load-more').hidden=true;$('result-count').hidden=true;$('results-title').textContent='Duke gjetur ndalesën tënde…';
  const requestMode=mode;
  try{
    let center,start=null,line=null,routeKm=null;
    if(replay)center=replay.center;
    else if(requestMode==='near'){toast('Duke marrë vendndodhjen…');try{center=await locate(controller.signal);}catch(error){if(controller.signal.aborted)throw error;locationRecovery(error,requestMode);}}
    else{toast('Duke kërkuar destinacionin…');center=await place(query,controller.signal);}
    if(requestMode==='route'){
     toast('Duke marrë pikën e nisjes dhe itinerarin…');
     if(replay)start=replay.start;
     else if($('origin-mode').value==='manual'){toast('Duke kërkuar pikën e nisjes…');start=await place(originQuery,controller.signal,'Zgjidh pikën e nisjes');}
     else try{start=await locate(controller.signal);}catch(error){if(controller.signal.aborted)throw error;locationRecovery(error,requestMode);}
     const r=replay?.line?{line:replay.line,km:replay.routeKm}:await route(start,center,controller.signal);line=r.line;routeKm=r.km;
     if(controller.signal.aborted)return;prepareTerrain(line,routeKm,center,replay?.terrain);
    }
    const historyId=rememberSearch({mode:requestMode,query:requestMode==='near'?'':replay?.query||query,origin:requestMode==='route'?(replay?.origin||($('origin-mode').value==='manual'?originQuery:`${start.lat.toFixed(4)}, ${start.lon.toFixed(4)}`)):'',center,start,line,routeKm,options,terrain:routeState?.terrain});
    if(routeState)routeState.historyId=historyId;

    if(controller.signal.aborted)return;
    toast('Duke ngarkuar regjistrin e karikuesve…');const data=await loadCharging(bounds(line??[center],options.radius),controller.signal);
    if(active!==controller)return;
    toast('Duke kontrolluar statusin te operatorët që ofrojnë të dhëna aktuale…');
    await providerReady;
    if(active!==controller)return;
    const checked=await checkOperating(parseStations(data,options,center,line),{signal:controller.signal,minPower:options.minPower});
    if(active!==controller)return;
    candidates=checked;lastSearch={line,center,start,requestMode,routeKm,fetchedAt:data.fetchedAt,replayed:Boolean(replay)};
    const fresh=new Map(candidates.map(s=>[s.id,s]));
    if(favourites.some(s=>fresh.has(s.id))){favourites=favourites.map(s=>fresh.get(s.id)||s);storage.set('evb-favourites',favourites);}
    applyOperating(false);

  }catch(error){
    if(active!==controller)return;
    if(error.locationRecovery){openSearch();queueMicrotask(()=>$(requestMode==='route'?'origin':'destination').focus());}
    $('results-title').textContent=error.locationRecovery?'Cakto lokacionin manualisht':'Provo një kërkim tjetër';
    toast(error.name==='AbortError'?'Kërkimi u anulua.':error.name==='TimeoutError'?'Shërbimi vonoi përgjigjen. Provo përsëri.':error.message||'Kërkimi dështoi. Kontrollo internetin dhe provo përsëri.',error.name!=='AbortError');
  }finally{if(active===controller){active=null;busy(false);if(!map)$('pick-map').disabled=true;}}
});
if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Open directly around the current location. Browsers ask for location permission if needed.
queueMicrotask(()=>{$('search-form').requestSubmit();});
