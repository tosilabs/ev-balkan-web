import {point,coordinates,distance,bounds,settings,parseStations,validStationId,destinationUrl,shareData,navigationUrl} from './core.mjs?v=1.5';
import {localPlaces} from './cities.mjs?v=1.5';
import {requestJson as json,loadCharging} from './services.mjs?v=1.5';
import {externalLocationUrl,bestClass,webUrl} from './details.mjs?v=1.5';
import {photoSection} from './photos.mjs?v=1.5';
import {finesLiveSection,showSources} from './sources-ui.mjs?v=1.5';
import {checkOperating,currentOperating,workingOnly} from './operating.mjs?v=1.5';
let candidates=[],lastSearch=null;
const $=id=>document.getElementById(id);
const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{toast('Telefoni nuk lejoi ruajtjen lokale. Kërkimi mbetet i përdorshëm.');}}};
let mode='near',active=null,stations=[],shown=0,savedView=false,selectedStation=null,map=null,markers=null,routeLayer=null,searchMarker=null,picking=false,radiusLayer=null,viewingRadius=10;
let favourites=storage.get('evb-favourites',[]);
if(!Array.isArray(favourites))favourites=[];
favourites=favourites.filter(s=>{try{return s&&typeof s.id==='string'&&validStationId(s.id)&&typeof s.name==='string'&&point(s.point.lat,s.point.lon)&&Number.isFinite(s.distance);}catch{return false;}}).slice(0,200);
let restored;
try{restored=settings(storage.get('evb-settings-v2',{radius:10,minPower:0,connector:'all',includeUnknown:true}));}catch{restored=settings({radius:10,minPower:0,connector:'all',includeUnknown:true});}
$('radius').value=String(restored.radius);if(!$('radius').value)$('radius').value='10';
$('power').value=String(restored.minPower);if(!$('power').value)$('power').value='0';
$('connector').value=restored.connector;$('speed').value=restored.speed;$('unknown').checked=restored.includeUnknown;
$('only-active').checked=restored.activeOnly;syncActive();
$('destination').value=String(storage.get('evb-query','')).slice(0,300);
function text(tag,value,className){const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node;}
function toast(message,error=false){$('status').textContent=message;$('status').title=message;$('results-note').textContent=message;$('status').classList.toggle('error',error);}
function showResults(open=true){$('results-panel').hidden=!open;document.body.classList.toggle('results-open',open);$('list-open').setAttribute('aria-expanded',String(open));}
function openSearch(){showResults(false);$('search-dialog').showModal();}
$('search-open').addEventListener('click',openSearch);
$('filters-open').addEventListener('click',openSearch);
$('list-open').addEventListener('click',()=>showResults($('results-panel').hidden));
$('results-close').addEventListener('click',()=>showResults(false));
$('status').addEventListener('click',()=>showResults(true));
$('locate-me').addEventListener('click',()=>{if(active)return;chooseMode('near');showResults(false);$('radius').value='10';$('search-form').requestSubmit();});
function busy(value){document.body.classList.toggle('busy',value);$('cancel').hidden=!value;
  document.querySelectorAll('#search-form input,#search-form select,#search-form button[type=submit],.tabs button,#saved-open,#pick-map,#locate-me,#filters-open,#search-open,#active-toggle').forEach(el=>el.disabled=value);
}
function chooseMode(value){
  mode=value;$('place-field').hidden=value==='near';$('destination').required=value!=='near';
  $('mode-description').textContent=value==='near'?'Karikuesit më të afërt me vendndodhjen tënde.':value==='route'?'Vendos destinacionin dhe gjej karikues pranë itinerarit.':'Kërko karikues pranë një qyteti, adrese ose pike në hartë.';
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
  map=L.map('map',{scrollWheelZoom:true}).setView([41.9981,21.4254],11);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  markers=L.layerGroup().addTo(map);
  map.on('click',event=>{
    if(!picking||active)return;
    const p=point(event.latlng.lat.toFixed(6),event.latlng.lng.toFixed(6));
    chooseMode('place');$('destination').value=`${p.lat},${p.lon}`;
    if(searchMarker)map.removeLayer(searchMarker);
    searchMarker=L.circleMarker([p.lat,p.lon],{radius:8,color:'#123e35',fillColor:'#d6ef9a',fillOpacity:1}).addTo(map);
    picking=false;$('pick-map').classList.remove('active');$('pick-map').textContent='⌖';$('pick-map').setAttribute('aria-label','Zgjidh pikë në hartë');
    toast('Duke kërkuar rreth pikës së zgjedhur…');$('search-form').requestSubmit();
  });
}
mapInit();
$('pick-map').addEventListener('click',()=>{if(!map)return;picking=!picking;$('pick-map').classList.toggle('active',picking);$('pick-map').textContent=picking?'×':'⌖';$('pick-map').setAttribute('aria-label',picking?'Anulo zgjedhjen e pikës':'Zgjidh pikë në hartë');if(picking)toast('Prek një pikë në hartë. Pastaj nis kërkimin.');});
function locate(signal){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(Error('Vendndodhja nuk mbështetet. Përdor kërkimin sipas vendit.'));return;}
    if(!window.isSecureContext){reject(Error('Vendndodhja kërkon HTTPS. Përdor kërkimin sipas qytetit.'));return;}
    let settled=false;
    const finish=(callback,value)=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);callback(value);};
    const abort=()=>finish(reject,new DOMException('Kërkimi u anulua.','AbortError'));
    signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}
    navigator.geolocation.getCurrentPosition(pos=>finish(resolve,point(pos.coords.latitude,pos.coords.longitude)),error=>finish(reject,Error(error.code===1?'Vendndodhja nuk u lejua. Lejoje në shfletues ose kërko sipas qytetit.':'Vendndodhja nuk u mor. Provo jashtë ose kërko sipas qytetit.')),{enableHighAccuracy:true,timeout:20000,maximumAge:60000});
  });
}
async function place(query,signal){
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
    const dialog=$('place-dialog'),list=$('place-options');list.replaceChildren();let selected=false;
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
      const r=data.routes?.[0];if(data.code!=='Ok'||!r?.geometry?.coordinates?.length)continue;
      if(r.distance>1500000)throw Error('Versioni i parë mbështet itinerare deri në 1500 km. Kërko pjesë të rrugës.');
      return {line:r.geometry.coordinates.map(c=>point(c[1],c[0])),km:r.distance/1000};
    }catch(error){if(signal.aborted)throw error;if(error.message.includes('1500 km'))throw error;}
  }
  throw Error('Itinerari nuk u llogarit. Provo “Një vend” për të gjetur karikues pranë destinacionit.');
}
function clearMap(){markers?.clearLayers();if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}if(radiusLayer){map.removeLayer(radiusLayer);radiusLayer=null;}}
function drawResults(line,center,preserve=false){
  if(!map)return;clearMap();
  if(line){routeLayer=L.polyline(line.map(p=>[p.lat,p.lon]),{color:'#78964e',weight:5,opacity:.85}).addTo(map);}
  const points=[];
  stations.forEach((station,i)=>{const p=station.point;points.push([p.lat,p.lon]);
    const speed=station.speed||bestClass(station.connections||[]),label=`${i+1}. ${station.name} · ${speed.label} · ${currentOperating(station).label}`;
    const icon=L.divIcon({className:'numbered-marker',html:`<span class="map-marker speed-${speed.key} operating-${currentOperating(station).key}">${i+1}</span>`,iconSize:[34,34],iconAnchor:[17,17]});
    const marker=L.marker([p.lat,p.lon],{icon,title:label,alt:label}).addTo(markers);
    marker.on('click',()=>{showResults(true);
      if(i>=shown){shown=Math.min(stations.length,Math.ceil((i+1)/12)*12);renderCards();}
      const card=document.querySelector(`[data-station-index="${i}"]`);if(card){document.querySelectorAll('.highlight').forEach(el=>el.classList.remove('highlight'));card.classList.add('highlight');const extra=card.querySelector('details');if(extra)extra.open=true;card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});}
    });
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
function locationDetails(station){
 const details=document.createElement('details');details.className='station-more';details.append(text('summary','Foto, operatori dhe informacione'));
 const body=document.createElement('div');body.className='station-more-body';const info=station.info||{},provider=info.provider||{};
 if(info.description)body.append(text('p',info.description));
 const connections=station.connections||[];
 if(connections.length){body.append(text('h4','Lidhësit e raportuar'));for(const c of connections)body.append(text('p',`${c.label}${c.current?' · '+c.current:''} · ${c.power?c.power+' kW':'fuqia e panjohur'}${c.count?' · '+c.count+' lidhës':''}`));}
 if(info.capacity)body.append(text('p','Kapacitet i raportuar: '+info.capacity));
 if(info.payments?.length)body.append(text('p','Pagesa / hyrja e raportuar: '+info.payments.join(', ')));
 if(station.access)body.append(text('p','Qasja e raportuar: '+station.access));
 if(info.checkedAt)body.append(text('p','Kontrolli i shënuar në regjistër: '+info.checkedAt));
 body.append(text('h4','Operatori dhe aplikacioni'));
 if(provider.name||station.operator)body.append(text('p',provider.name||station.operator));else body.append(text('p','Operatori nuk është i specifikuar.'));
 const links=document.createElement('div');links.className='provider-links';
 for(const [label,url] of [['Faqja e operatorit ↗',provider.website],['Faqja e lokacionit ↗',provider.locationWebsite],[provider.appLabel||'Aplikacioni i operatorit',provider.appPage],['Google Play ↗',provider.android],['App Store ↗',provider.ios]])if(webUrl(url))links.append(externalLink(label,webUrl(url)));
 if(links.childElementCount)body.append(links);else body.append(text('p','Nuk ka lidhje të verifikuar për web ose aplikacionin në këtë regjistër.','field-note'));
 if(info.phone){const number=info.phone.replace(/[^+0-9]/g,'');if(number.replace(/\D/g,'').length>=6)body.append(externalLink('Telefono: '+info.phone,'tel:'+number));}
 if(station.provenance?.length){body.append(text('h4','Burimet e këtij lokacioni'));for(const p of station.provenance){const row=document.createElement('p');row.append(externalLink(p.name+' ↗',p.url));if(p.license)row.append(document.createTextNode(' · '+p.license));if(p.fetchedAt)row.append(document.createTextNode(' · marrë më '+new Date(p.fetchedAt).toLocaleDateString('sq-AL')));body.append(row);}}
 if(station.sourceUpdatedAt)body.append(text('p','Përditësimi i raportuar nga burimi: '+station.sourceUpdatedAt));
 if(station.finesId)body.append(finesLiveSection(station.finesId));
 body.append(text('h4','Foto të lokacionit'),photoSection(station),text('h4','Reviews dhe pamje rruge'));
 const reviews=document.createElement('div');reviews.className='provider-links';reviews.append(externalLink('Kërko reviews dhe foto në Maps ↗',externalLocationUrl(station,'reviews')),externalLink('Pamje rruge në Maps ↗',externalLocationUrl(station,'streetview')));body.append(reviews,text('p','Reviews nuk importohen në këtë faqe. Kontrollo që lokacioni në Maps është i njëjti.','field-note'));
 details.append(body);return details;
}
function renderCards(){
  const container=$('results');container.replaceChildren();
  if(!stations.length){container.append(text('p',savedView?'Nuk ke ende karikues të ruajtur. Shtyp zemrën në një rezultat për ta ruajtur.':$('only-active').checked?'Nuk ka pika të konfirmuara në punë me këta filtra. Pikat pa status aktual nuk përfshihen.':'Nuk u gjetën karikues me këta filtra. Rrit rrezen, ul fuqinë minimale ose përfshi lidhës të paspecifikuar.','empty-note'));}
  stations.slice(0,shown).forEach((station,i)=>{
    const card=document.createElement('article');card.className='station-card';card.dataset.stationIndex=String(i);
    const top=document.createElement('div');top.className='card-top';top.append(text('span',String(i+1),'station-number'));
    const save=text('button',favourite(station)?'♥':'♡',favourite(station)?'save saved':'save');save.setAttribute('aria-label',favourite(station)?`Hiq nga të ruajturat: ${station.name}`:`Ruaj: ${station.name}`);save.setAttribute('aria-pressed',String(favourite(station)));save.addEventListener('click',()=>toggleSaved(station));top.append(save);card.append(top,text('h3',station.name),text('p',station.address||'Adresa e paspecifikuar','station-address'));
    if(station.operator)card.append(text('p','Operatori: '+station.operator,'station-provider'));
    const tags=document.createElement('div');tags.className='station-tags';
    for(const value of [station.connectors,station.power?`${station.power} kW`:'Fuqia e panjohur',savedView?'Nga kërkimi i ruajtur':`${station.distance.toFixed(1)} km`])tags.append(text('span',value,station.unknown||station.compatible===false?'tag unknown':'tag'));
    const speed=station.speed||bestClass(station.connections||[]);card.querySelector('.station-number').classList.add('category-'+speed.key);tags.append(text('span',speed.label,'tag category-'+speed.key));
    const operating=currentOperating(station);tags.append(text('span',operating.label,'tag operating-status operating-'+operating.key));
    card.append(tags);
    const detail=document.createElement('div');detail.className='station-details';detail.append(text('p',station.finesId?'Disponueshmëria: kontrolloje te detajet Fines':'Disponueshmëria: e panjohur'),text('p',station.price?`Tarifa e raportuar: ${station.price}`:'Çmimi: i panjohur'));
    detail.append(text('p',operating.observedAt?'Raportuar nga Fines: '+new Date(operating.observedAt).toLocaleString('sq-AL'):operating.reason));
    if(!station.unknown&&station.compatible===false)detail.append(text('p','Lidhësi i regjistruar nuk përputhet me Audi e-tron.'));
    if(station.hours)detail.append(text('p',`Orari i raportuar: ${station.hours}`));
    const source=text('a','Burimi: '+(station.sourceName||'OpenStreetMap')+' ↗');source.href=webUrl(station.source)||`https://www.openstreetmap.org/${station.id}`;source.target='_blank';source.rel='noopener';detail.append(source);card.append(detail,locationDetails(station));
    const share=text('button','Dërgo te Audi ↗','primary');share.addEventListener('click',()=>openShare(station));card.append(share);
    const links=document.createElement('div');links.className='nav-links';
    for(const [target,label] of [['osmand','OsmAnd ↗'],['waze','Waze ↗']]){const a=text('a',label);a.href=navigationUrl(station,target);a.target='_blank';a.rel='noopener';links.append(a);}
    card.append(links);container.append(card);
  });
  $('load-more').hidden=shown>=stations.length;
  $('show-unconfirmed').hidden=savedView||!$('only-active').checked||stations.length>0;
}
function syncActive(){$('active-toggle').setAttribute('aria-pressed',String($('only-active').checked));}
function applyOperating(preserve=true){
 syncActive();if(!lastSearch||savedView)return;
 stations=$('only-active').checked?workingOnly(candidates):candidates;shown=Math.min(12,stations.length);
 const {requestMode,routeKm,line,center,fetchedAt}=lastSearch;
 $('results-title').textContent=$('only-active').checked?'Të konfirmuar në punë':requestMode==='route'?'Karikues përgjatë rrugës':requestMode==='place'?'Karikues pranë vendit':'Karikues pranë teje';
 $('results-eyebrow').textContent=requestMode==='route'?`ITINERAR ${routeKm.toFixed(0)} KM`:'NDALESA TË MUNDSHME';
 $('result-count').textContent=String(stations.length);$('result-count').hidden=false;
 const counts={working:0,offline:0,unknown:0};for(const s of candidates)counts[currentOperating(s).key]++;
 toast(`${counts.working} në punë · ${counts.offline} jashtë shërbimit · ${counts.unknown} të pakonfirmuar. ${fetchedAt?'Regjistri u shkarkua më '+new Date(fetchedAt).toLocaleDateString('sq-AL')+'. ':''}Status aktual nga Fines, kur ofrohet. Në punë mund të jetë edhe i zënë. ${requestMode==='route'?'Distanca nga vija e itinerarit, jo devijimi rrugor.':'Distanca në vijë ajrore.'}`);
 renderCards();drawResults(line,center,preserve);
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
  savedView=true;stations=$('only-active').checked?workingOnly(favourites):[...favourites];shown=Math.min(12,stations.length);$('results-title').textContent='Karikuesit e tu';$('results-eyebrow').textContent='TË RUAJTURAT';$('result-count').textContent=String(stations.length);$('result-count').hidden=false;
  toast('Të ruajtura në këtë shfletues. Tarifat dhe detajet mund të jenë vjetruar; distancat nuk rillogariten.');renderCards();drawResults(null,null);showResults(true);
});
$('cancel').addEventListener('click',()=>{active?.abort();active=null;busy(false);$('results-title').textContent='Kërkimi u anulua';toast('Mund të nisësh një kërkim të ri.');});
$('search-form').addEventListener('submit',async event=>{
  event.preventDefault();if(active)return;
  let options;try{options=settings({radius:$('radius').value,minPower:$('power').value,connector:$('connector').value,speed:$('speed').value,activeOnly:$('only-active').checked,includeUnknown:$('unknown').checked});}catch(error){toast(error.message,true);return;}
  const query=$('destination').value.trim();if(mode!=='near'&&!query){toast('Vendos një qytet, adresë ose koordinata.',true);return;}
  storage.set('evb-settings-v2',options);if(query)storage.set('evb-query',query);
  if($('search-dialog').open)$('search-dialog').close();showResults(false);viewingRadius=options.radius;
  $('radius-badge').textContent=`${options.radius} km`;$('filter-badge').textContent=options.connector==='all'?'Të gjithë':options.connector==='both'?'Për Audi':options.connector;
  const controller=new AbortController();active=controller;busy(true);savedView=false;lastSearch=null;candidates=[];stations=[];shown=0;clearMap();$('results').replaceChildren();$('load-more').hidden=true;$('result-count').hidden=true;$('results-title').textContent='Duke gjetur ndalesën tënde…';
  const requestMode=mode;
  try{
    let center,line=null,routeKm=null;
    if(requestMode==='near'){toast('Duke marrë vendndodhjen…');center=await locate(controller.signal);}
    else{toast('Duke kërkuar destinacionin…');center=await place(query,controller.signal);}
    if(requestMode==='route'){toast('Duke marrë vendndodhjen dhe itinerarin…');const start=await locate(controller.signal);const r=await route(start,center,controller.signal);line=r.line;routeKm=r.km;}
    if(controller.signal.aborted)return;
    toast('Duke ngarkuar regjistrin e karikuesve…');const data=await loadCharging(bounds(line??[center],options.radius),controller.signal);
    if(active!==controller)return;
    toast('Duke kontrolluar statusin te operatorët që ofrojnë të dhëna aktuale…');
    const checked=await checkOperating(parseStations(data,options,center,line),{signal:controller.signal,minPower:options.minPower});
    if(active!==controller)return;
    candidates=checked;lastSearch={line,center,requestMode,routeKm,fetchedAt:data.fetchedAt};
    const fresh=new Map(candidates.map(s=>[s.id,s]));
    if(favourites.some(s=>fresh.has(s.id))){favourites=favourites.map(s=>fresh.get(s.id)||s);storage.set('evb-favourites',favourites);}
    applyOperating(false);

  }catch(error){
    if(active!==controller)return;
    $('results-title').textContent='Provo një kërkim tjetër';
    toast(error.name==='AbortError'?'Kërkimi u anulua.':error.name==='TimeoutError'?'Shërbimi vonoi përgjigjen. Provo përsëri.':error.message||'Kërkimi dështoi. Kontrollo internetin dhe provo përsëri.',error.name!=='AbortError');
  }finally{if(active===controller){active=null;busy(false);if(!map)$('pick-map').disabled=true;}}
});
if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Open directly around the current location. Browsers ask for location permission if needed.
queueMicrotask(()=>{$('search-form').requestSubmit();});
