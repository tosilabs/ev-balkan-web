import {createPageTimer} from './lifecycle.mjs?v=3.6';
import {distance,navigationUrl} from './core.mjs?v=3.6';
import {drivingChoices} from './driving-core.mjs?v=3.6';
import {stationTravel,formatTravel} from './travel.mjs?v=3.6';
import {currentOperating} from './operating.mjs?v=3.6';

export function createDriving({context,closePanels,search,setupRoute,focusLocation,focusStation,share,notice,navigate}){
 const $=id=>document.getElementById(id);
 let enabled=false,kind='near',choices=[],selected=null,controller=null,travelAt=0,travelOrigin=null,wake=null,follow=true;
 function origin(){const state=context();return state.location&&Date.now()-state.location.at<30000?{point:state.location.point,gps:true}:state.search?.start||state.search?.center?{point:state.search.start||state.search.center,gps:false}:null;}
 async function keepAwake(){if(!enabled||document.hidden||wake||!navigator.wakeLock)return;try{wake=await navigator.wakeLock.request('screen');wake.addEventListener('release',()=>{wake=null;});if(!enabled||document.hidden){await wake.release();wake=null;}}catch{/* Optional browser capability. */}}
 function stopTravel(){controller?.abort();controller=null;travelAt=0;travelOrigin=null;}
 async function travel(item,from){
  stopTravel();if(!from){$('drive-travel').textContent='Vendndodhja mungon';$('drive-travel-note').textContent='Përcakto nisjen te kërkimi.';return;}
  const request=new AbortController();controller=request;travelAt=Date.now();travelOrigin=from.point;
  $('drive-travel').textContent='Po llogaris kohën…';$('drive-travel-note').textContent=from.gps?'Nga GPS-i · pa trafik aktual':'Nga pika e kërkimit · pa trafik aktual';
  try{const result=await stationTravel(from.point,item.station.point,{signal:request.signal});if(!enabled||controller!==request||selected!==item.station.id)return;
   const formatted=formatTravel(result);$('drive-travel').textContent=`${formatted.distance} · ${formatted.duration}`;
  }catch{if(!enabled||request.signal.aborted||controller!==request)return;$('drive-travel').textContent=item.km===null?'Koha nuk u mor':`${item.km.toFixed(1)} km në vijë ajrore`;$('drive-travel-note').textContent='Koha rrugore mungon · provo navigimin';}
 }
 function select(item){selected=item?.station.id||null;stopTravel();if(!item)return;
  $('drive-title').textContent=item.station.name;
  const power=Math.max(...item.connections.map(c=>Number(c.power)||0));
  $('drive-connector').textContent=[...new Set(item.connections.map(c=>c.label))].join(' / ')+(power?' · '+power+' kW':'');
  const status=currentOperating(item.station);$('drive-availability').textContent=status.key==='working'?(status.available?'Ka lidhës të lirë':'Në punë · i zënë'):'Status i pakonfirmuar';
  $('drive-availability').dataset.state=status.key;
  $('drive-navigate').href=navigationUrl(item.station,'waze');
  $('drive-index').textContent=`${choices.findIndex(c=>c.station.id===selected)+1} / ${choices.length}`;
  $('drive-next').disabled=choices.length<2;
  travel(item,origin());focusStation(item.station);
 }
 function refresh(){if(!enabled)return;const state=context(),from=origin();
  $('drive-near').disabled=state.busy;$('drive-fast').disabled=state.busy;$('drive-route').disabled=state.busy;
  for(const id of ['near','fast','route'])$('drive-'+id).setAttribute('aria-pressed',String(kind===id));
  $('drive-message').textContent=state.busy?'Duke kërkuar karikues…':kind==='route'?'Karikues përgjatë itinerarit':kind==='fast'?'CCS2 · të paktën 50 kW':'Pranë teje · CCS2 dhe Type 2';
  $('drive-location-note').hidden=Boolean(from?.gps);$('drive-location-note').textContent=from?'Nga pika e kërkimit · GPS jo aktual':'GPS mungon · cakto një vend';
  const previous=selected;
  choices=state.busy?[]:drivingChoices(state.candidates,{origin:from?.point,line:kind==='route'?state.search?.line:null,fast:kind==='fast'});
  $('drive-card').hidden=choices.length===0;$('drive-empty').hidden=choices.length>0;
  $('drive-empty-title').textContent=state.busy?'Po gjej ndalesën tënde…':'Nuk ka karikues të përshtatshëm';
  $('drive-empty-note').textContent=state.busy?'Rezultati shfaqet këtu sapo të jetë gati.':state.error||'Provo “Pranë meje” ose cakto një vend nga kërkimi i plotë.';
  $('drive-manual').hidden=state.busy;
  if(!choices.length){selected=null;stopTravel();return;}
  const item=choices.find(c=>c.station.id===previous)||choices[0];
  if(item.station.id!==selected)select(item);
  else{const status=currentOperating(item.station);$('drive-availability').textContent=status.key==='working'?(status.available?'Ka lidhës të lirë':'Në punë · i zënë'):'Status i pakonfirmuar';$('drive-availability').dataset.state=status.key;$('drive-index').textContent=`${choices.indexOf(item)+1} / ${choices.length}`;$('drive-next').disabled=choices.length<2;
   if(Date.now()-travelAt>30000||from&&travelOrigin&&distance(from.point,travelOrigin)>.5)travel(item,from);}
 }
 function exit(){enabled=false;stopTravel();document.body.classList.remove('driving-mode');$('driving').hidden=true;$('drive-open').setAttribute('aria-pressed','false');wake?.release().catch(()=>{});wake=null;
  try{localStorage.setItem('udhembare-driving','false');}catch{}$('more-open').focus({preventScroll:true});}
 function enter({restore=false}={}){closePanels();for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();enabled=true;kind=context().search?.line?'route':'near';follow=true;document.body.classList.add('driving-mode');$('driving').hidden=false;$('drive-open').setAttribute('aria-pressed','true');
  try{localStorage.setItem('udhembare-driving','true');}catch{}keepAwake();refresh();focusLocation();$('drive-exit').focus({preventScroll:true});
  if(!restore&&!context().busy&&!context().search?.line&&(!context().search||origin()?.gps))search('near');
 }
 $('drive-open').addEventListener('click',()=>enter());$('drive-exit').addEventListener('click',exit);
 for(const id of ['near','fast'])$('drive-'+id).addEventListener('click',()=>{kind=id;selected=null;search(id);refresh();});
 $('drive-route').addEventListener('click',()=>{if(context().search?.line){kind='route';selected=null;refresh();}else{exit();setupRoute();}});
 $('drive-next').addEventListener('click',()=>{const index=choices.findIndex(c=>c.station.id===selected);select(choices[(index+1)%choices.length]);});
 $('drive-own-navigate').addEventListener('click',()=>{const item=choices.find(c=>c.station.id===selected);if(item)navigate(item.station);});
 $('drive-audi').addEventListener('click',()=>{const item=choices.find(c=>c.station.id===selected);if(item)share(item.station);});
 $('route-weather-alert').addEventListener('click',()=>{if(enabled)exit();},{capture:true});
 $('drive-manual').addEventListener('click',()=>{exit();$('search-open').click();});
 $('drive-follow').addEventListener('click',()=>{follow=true;focusLocation();$('drive-follow').setAttribute('aria-pressed','true');});
 document.addEventListener('visibilitychange',()=>{if(!enabled)return;if(document.hidden){wake?.release().catch(()=>{});wake=null;}else{keepAwake();refresh();}});
 createPageTimer(()=>{if(enabled&&!document.hidden)refresh();},30000);
 window.addEventListener('pagehide',()=>{stopTravel();wake?.release().catch(()=>{});});
 // Weather warnings retain one compact, readable map control in this mode.
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&enabled&&!document.querySelector('dialog[open]'))exit();});
 try{if(localStorage.getItem('udhembare-driving')==='true')enter({restore:true});}catch{}
 return {refresh,get active(){return enabled;},get stationId(){return enabled?selected:null;},exit,
  position(){if(!enabled)return;refresh();if(follow)focusLocation();},
  dragged(){if(enabled){follow=false;$('drive-follow').setAttribute('aria-pressed','false');}},
  pick(station){if(!enabled)return false;const item=choices.find(c=>c.station.id===station.id);if(item)select(item);else notice('Ky stacion nuk përputhet me filtrin e vozitjes. Provo “Pranë meje”.');return true;}
 };
}
