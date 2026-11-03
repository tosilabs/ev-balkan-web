import {createPageTimer} from './lifecycle.mjs?v=3.6';
import {fetchNavigation,navigationProgress,freshNavigationFix,maneuverDistance} from './navigation-core.mjs?v=3.6';
import {createNavigationMap} from './navigation-map.mjs?v=3.6';
import {navigationUrl} from './core.mjs?v=3.6';

export function createNavigation({context,getFix,closePanels}){
 const $=id=>document.getElementById(id),options=$('nav-options');
 $('nav-menu-open').addEventListener('click',()=>options.showModal());
 options.addEventListener('click',event=>{if(event.target.closest('[data-nav-close]'))options.close();},{capture:true});
 let active=false,controller=null,view=null,route=null,target=null,label='',progress=0,lastAt=0,follow=true,preview=false,needsRoute=false,arrived=false;
 let outside=0,outsideAt=0,arrivalCount=0,reroutedAt=0,sound=false,spoken=new Set(),wake=null,generation=0;
 function say(text){if(!sound||document.hidden||!globalThis.speechSynthesis)return;try{speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='sq-AL';const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('sq'));if(voice)utterance.voice=voice;speechSynthesis.speak(utterance);}catch{}}
 function hint(message){$('nav-status').textContent=message;}
 function turn(text,icon='↑',distance='—'){$('nav-instruction').textContent=text;$('nav-turn-icon').textContent=icon;$('nav-turn-distance').textContent=distance;}
 async function awake(){if(!active||document.hidden||wake||!navigator.wakeLock)return;try{const lock=await navigator.wakeLock.request('screen');if(!active||document.hidden){await lock.release();return;}wake=lock;lock.addEventListener('release',()=>{if(wake===lock)wake=null;});}catch{}}
 function quiet(){try{globalThis.speechSynthesis?.cancel();}catch{}wake?.release().catch(()=>{});wake=null;}
 function stop(){if(options.open)options.close();generation++;active=false;controller?.abort();controller=null;quiet();view?.remove();view=null;route=null;target=null;$('navigation').hidden=true;document.body.classList.remove('navigation-mode');$('nav-retry').hidden=true;$('more-open').focus({preventScroll:true});}
 async function calculate(start,{manual=false}={}){
  controller?.abort();const current=new AbortController();controller=current;const token=generation;
  needsRoute=true;preview=manual;turn('Duke llogaritur itinerarin…','↝');$('nav-remaining').textContent='—';$('nav-time').textContent='—';$('nav-retry').hidden=true;hint(manual?'Parapamje nga nisja manuale · GPS mungon':'Po marr udhëzimet e rrugës…');
  try{const result=await fetchNavigation([start,target],{signal:current.signal});if(!active||current.signal.aborted||token!==generation)return;
   route=result;view?.setRoute(route);progress=0;lastAt=0;outside=0;outsideAt=0;arrivalCount=0;arrived=false;needsRoute=false;spoken=new Set();
   if(manual){turn(route.turns[0].text,route.turns[0].icon,maneuverDistance(route.turns[0].atKm));$('nav-remaining').textContent=(route.distance/1000).toFixed(1)+' km';$('nav-time').textContent=Math.ceil(route.duration/60)+' min';hint('Parapamje · lejo GPS-in për udhëzim gjatë lëvizjes');$('nav-retry').hidden=false;view?.position({point:start,preview:true},true);}
   else position(context().location);
  }catch(error){if(!active||current.signal.aborted||token!==generation)return;needsRoute=true;turn('Navigimi nuk u llogarit','!');hint(error.message||'Kontrollo internetin dhe provo përsëri.');$('nav-retry').hidden=false;}
  finally{if(controller===current)controller=null;}
 }
 function position(fix){if(!active||!route||needsRoute||arrived||preview)return;
  if(!freshNavigationFix(fix)){globalThis.speechSynthesis?.cancel();$('nav-remaining').textContent='—';$('nav-time').textContent='—';turn('Po pres sinjal të saktë GPS','◎');hint('Udhëzimet janë pezull derisa të merret pozicion aktual.');return;}
  if(fix.at<=lastAt)return;lastAt=fix.at;
  const state=navigationProgress(route,fix,progress);view?.position(fix,follow,state.bearing);
  if(state.offset>Math.max(.08,fix.accuracy/500)){globalThis.speechSynthesis?.cancel();$('nav-remaining').textContent='—';$('nav-time').textContent='—';$('nav-retry').hidden=false;outside++;outsideAt||=Date.now();turn('Je jashtë itinerarit','↝');hint('Duke kontrolluar nëse nevojitet rillogaritje…');
   if(outside>=3&&Date.now()-outsideAt>=5000&&Date.now()-reroutedAt>=30000&&!document.hidden){reroutedAt=Date.now();calculate(fix.point);}
   return;
  }
  $('nav-retry').hidden=true;outside=0;outsideAt=0;progress=Math.max(progress,state.progress);
  turn(state.turn.text,state.turn.icon,maneuverDistance(state.toTurn));
  $('nav-remaining').textContent=state.remainingKm<10?state.remainingKm.toFixed(1)+' km':Math.round(state.remainingKm)+' km';$('nav-time').textContent=Math.max(1,Math.ceil(state.remainingSeconds/60))+' min';
  const eta=new Date(Date.now()+state.remainingSeconds*1000).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});hint('Mbërritje rreth '+eta+' · pa trafik aktual');
  const milestone=state.toTurn<.04?'now':state.toTurn<.15?'near':state.toTurn<.5?'far':null;
  if(milestone){const key=route.turns.indexOf(state.turn)+':'+milestone;if(!spoken.has(key)){spoken.add(key);say((milestone==='now'?'Tani. ':'Pas '+maneuverDistance(state.toTurn)+'. ')+state.turn.text);}}
  arrivalCount=state.arrived&&fix.accuracy<=50?arrivalCount+1:0;
  if(arrivalCount>=2){arrived=true;turn('Mbërrite në destinacion','⚑','0 m');$('nav-remaining').textContent='0 km';$('nav-time').textContent='Mbërrite';hint(label);say('Mbërrite në destinacion.');}
 }
 async function start(destination,name='Destinacioni'){
  if(active)stop();closePanels();for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  active=true;generation++;const token=generation;target=destination;label=name;progress=0;lastAt=0;route=null;follow=true;preview=false;needsRoute=true;arrived=false;sound=false;spoken=new Set();outside=0;outsideAt=0;reroutedAt=0;
  $('navigation').hidden=false;document.body.classList.add('navigation-mode');$('nav-destination').textContent=label;$('nav-voice').disabled=!globalThis.speechSynthesis;$('nav-voice').setAttribute('aria-pressed','false');$('nav-voice').textContent='♪ Zëri';$('nav-follow').setAttribute('aria-pressed','true');$('nav-3d').disabled=false;$('nav-3d').textContent='3D';$('nav-3d').setAttribute('aria-pressed','true');$('nav-retry').hidden=true;
  $('nav-external').href=navigationUrl({point:target},'waze');$('nav-remaining').textContent='—';$('nav-time').textContent='—';turn('Po marr vendndodhjen…','◎');hint('Lejo GPS-in për të nisur navigimin.');
  view=createNavigationMap($('navigation-map'),{onDrag:()=>{follow=false;$('nav-follow').setAttribute('aria-pressed','false');},changed:mode=>{if(!active)return;$('nav-map-note').textContent=mode==='3d'?'OpenFreeMap · 3D sipas të dhënave':mode==='2d'?'Pamje 2D · 3D nuk u ngarkua':'Harta nuk u ngarkua. Udhëzimet mbeten në ekran.';if(mode!=='3d'){$('nav-3d').disabled=true;$('nav-3d').textContent='2D';$('nav-3d').setAttribute('aria-pressed','false');}}});
  view?.setTraffic(context().traffic||null);awake();$('nav-stop').focus({preventScroll:true});const current=new AbortController();controller=current;
  try{const fix=await getFix(current.signal);if(!active||token!==generation||current.signal.aborted)return;if(!freshNavigationFix(fix))throw Error('GPS-i nuk është mjaftueshëm i saktë.');view?.position(fix,true);await calculate(fix.point);}
  catch(error){if(!active||token!==generation||current.signal.aborted)return;const search=context().search,start=search?.start||search?.center;
   if(start)await calculate(start,{manual:true});else{turn('GPS-i nuk është i disponueshëm','◎');hint('Lejo vendndodhjen ose krijo një itinerar me nisje manuale.');$('nav-retry').hidden=false;}}
  finally{if(controller===current)controller=null;}
 }
 $('nav-stop').addEventListener('click',stop);
 $('nav-3d').addEventListener('click',()=>{const tilted=view?.toggle();$('nav-3d').setAttribute('aria-pressed',String(Boolean(tilted)));$('nav-3d').textContent=tilted?'3D':'2D';});
 $('nav-follow').addEventListener('click',()=>{follow=true;$('nav-follow').setAttribute('aria-pressed','true');const fix=context().location;if(freshNavigationFix(fix))view?.position(fix,true,route?navigationProgress(route,fix,progress).bearing:0);});
 $('nav-voice').addEventListener('click',()=>{sound=!sound;$('nav-voice').setAttribute('aria-pressed',String(sound));$('nav-voice').textContent=sound?'♪ Zëri aktiv':'♪ Zëri';if(sound){spoken.clear();if(route&&!needsRoute&&!preview){lastAt=0;position(context().location);}else say('Udhëzimet zanore u aktivizuan.');}else globalThis.speechSynthesis?.cancel();});
 $('nav-retry').addEventListener('click',async()=>{if(!active||controller)return;const token=generation,current=new AbortController();controller=current;hint('Po kërkoj GPS aktual…');try{const fix=await getFix(current.signal);if(!active||token!==generation||current.signal.aborted)return;if(!freshNavigationFix(fix))throw Error('Prit sinjal më të saktë GPS.');await calculate(fix.point);}catch(error){if(active&&!current.signal.aborted)hint(error.message);}finally{if(controller===current)controller=null;}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active&&!document.querySelector('dialog[open]'))stop();});
 document.addEventListener('visibilitychange',()=>{if(!active)return;if(document.hidden){quiet();hint('Navigimi është pezull në sfond.');}else{awake();lastAt=0;position(context().location);}});
 createPageTimer(()=>{if(active&&!document.hidden&&!preview&&!arrived&&!needsRoute&&!freshNavigationFix(context().location)){globalThis.speechSynthesis?.cancel();$('nav-remaining').textContent='—';$('nav-time').textContent='—';turn('Po pres sinjal të saktë GPS','◎');hint('Udhëzimet janë pezull derisa të merret pozicion aktual.');}},2000);
 window.addEventListener('pagehide',stop);
 return {start,stop,position,setTraffic:data=>view?.setTraffic(data),getLine:()=>route?.line||null,focusReport(p){follow=false;$('nav-follow').setAttribute('aria-pressed','false');view?.focus(p);},get active(){return active;},refresh(){const search=context().search;$('navigate-route').hidden=!search||search.requestMode==='near';$('navigate-route').disabled=context().busy;document.body.classList.toggle('navigation-ready',Boolean(search&&search.requestMode!=='near'));},route(){const search=context().search;if(search?.center)start(search.center,search.requestMode==='route'?'Destinacioni i itinerarit':'Vendi i zgjedhur');}};
}
