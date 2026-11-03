import {createPageTimer} from './lifecycle.mjs?v=3.6';
import {TRAFFIC_PROVIDER,TRAFFIC_TYPES,trafficArea,visibleTraffic,nearestTraffic,reserveTrafficBudget,fetchTraffic} from './traffic-core.mjs?v=3.6';

export function createTraffic({map,L,keys,context,onData=()=>{},focusReport=()=>{}}){
 const $=id=>document.getElementById(id),dialog=$('traffic-dialog');
 let data=null,layer=null,controller=null,generation=0,lastPosition=0,signature=null;
 const store={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
 const text=(tag,value)=>{const element=document.createElement(tag);element.textContent=value;return element;};
 function displayed(){const visible=visibleTraffic(data),filter=$('traffic-filter').value;return visible?{...visible,alerts:visible.alerts.filter(a=>filter==='all'||a.type===filter),jams:filter==='all'||filter==='JAM'?visible.jams:[]}:null;}
 function cancel(){generation++;controller?.abort();controller=null;$('traffic-refresh').disabled=false;}
 function render(){
  const current=displayed(),nextSignature=current?[current.fetchedAt,$('traffic-filter').value,...current.alerts.map(a=>a.id),...current.jams.map(j=>j.id)].join('|'):'';const changed=signature!==nextSignature;
  if(changed){signature=nextSignature;layer?.remove();layer=null;
  if(map&&L&&current){if(!map.getPane('trafficReports')){map.createPane('trafficReports');map.getPane('trafficReports').style.zIndex='580';}layer=L.layerGroup().addTo(map);
   for(const report of current.alerts){const dot=text('span',report.letter);dot.className='traffic-marker-dot';dot.style.background=report.color;
    const icon=L.divIcon({className:'traffic-marker',html:dot.outerHTML,iconSize:[24,24],iconAnchor:[12,12]});
    const popup=document.createElement('div');popup.className='traffic-popup';popup.append(text('strong',report.label),text('p',report.street),text('p','Raportuar më '+new Date(report.at).toLocaleString('sq-AL')),text('small','Waze përmes OpenWeb Ninja · raportim, jo konfirmim në vend'));
    L.marker([report.point.lat,report.point.lon],{pane:'trafficReports',icon,title:report.label,alt:report.label}).addTo(layer).bindPopup(popup);
   }
   for(const jam of current.jams)L.polyline(jam.line.map(p=>[p.lat,p.lon]),{pane:'trafficReports',color:jam.level>=4?'#c74637':'#d68016',weight:5,opacity:.85}).addTo(layer).bindTooltip(jam.speed===null?'Trafik i raportuar':`Trafik · ${jam.speed} km/h sipas burimit`);
  }
  onData(current);}
  if(changed)$('traffic-rows').replaceChildren();
  if(current){$('traffic-summary').textContent=`${current.alerts.length} raportime · ${current.jams.length} segmente trafiku · ${current.area.label}`;
   $('traffic-time').textContent='Marrë më '+new Date(current.fetchedAt).toLocaleTimeString('sq-AL')+(Date.now()-current.fetchedAt>300000?' · të dhëna mbi 5 minuta, rifresko':'');
   if(changed)for(const report of current.alerts.slice(0,50)){const row=document.createElement('button');row.type='button';row.className='traffic-row';row.dataset.reportAt=String(report.at);row.append(text('strong',report.label),text('span',report.street||'Pa emër rruge'),text('small',Math.max(0,Math.floor((Date.now()-report.at)/60000))+' min nga raportimi'));
    row.addEventListener('click',()=>{dialog.close();focusReport(report.point);});$('traffic-rows').append(row);
   }
   if(!changed)for(const row of $('traffic-rows').querySelectorAll('[data-report-at]'))row.querySelector('small').textContent=Math.max(0,Math.floor((Date.now()-Number(row.dataset.reportAt))/60000))+' min nga raportimi';
   if(changed&&!current.alerts.length&&!current.jams.length)$('traffic-rows').append(text('p','Nuk u kthyen raportime me këta filtra. Mbulimi nuk garantohet.'));
  }else{$('traffic-summary').textContent=data?'Raportimet skaduan. Rifresko për të dhëna të reja.':'Nuk janë marrë ende raportime.';$('traffic-time').textContent='';}
  try{const state=keys.status(TRAFFIC_PROVIDER);$('traffic-key-state').textContent=state.unlocked?'Çelësi Waze është i zhbllokuar.':state.saved?'Zhblloko çelësin Waze për një kërkesë të re.':'Vendos çelësin OpenWeb Ninja për Waze.';
   const raw=JSON.parse(store.getItem('udhembare-waze-usage-v1')||'null'),month=new Date().toISOString().slice(0,7);$('traffic-budget').textContent=`${raw?.month===month?raw.count:0} / 100 tentativa nga ky shfletues këtë muaj · kuotën reale kontrolloje te ofruesi.`;
  }catch{$('traffic-key-state').textContent='Ruajtja lokale nuk është e disponueshme.';}
  position(true);
 }
 function open(){if(dialog.open)return;render();$('traffic-status').textContent='';dialog.showModal();}
 async function refresh(){if(controller)return;
  try{if(!keys.status(TRAFFIC_PROVIDER).unlocked){$('traffic-status').textContent='Zhblloko çelësin te butoni më poshtë, pastaj kërko raportimet.';return;}
   const state=context(),fix=state.location,center=fix&&Date.now()-fix.at<30000?fix.point:state.search?.start||state.search?.center||state.center;
   if(!center)throw Error('Zgjidh një vend në hartë ose lejo GPS-in.');
   const area=trafficArea({mode:$('traffic-area').value,center,line:state.line||state.search?.line});
   reserveTrafficBudget(store);const current=new AbortController(),token=++generation;controller=current;$('traffic-refresh').disabled=true;$('traffic-status').textContent='Duke marrë raportimet…';
   const timer=setTimeout(()=>current.abort(),12000);
   try{const result=await keys.withKey(TRAFFIC_PROVIDER,key=>fetchTraffic(area,key,{signal:current.signal}));if(current.signal.aborted||token!==generation)return;data=result;render();$('traffic-status').textContent='Raportimet u përditësuan. Rifreskimi është manual.';}
   catch(error){if(token!==generation)return;$('traffic-status').textContent=current.signal.aborted?'Kërkesa u anulua ose vonoi përgjigjen.':error.message;}
   finally{clearTimeout(timer);if(controller===current){controller=null;$('traffic-refresh').disabled=false;}render();}
  }catch(error){$('traffic-status').textContent=error.message;render();}
 }
 function position(force=false){if(!force&&Date.now()-lastPosition<2000)return;lastPosition=Date.now();const state=context(),fix=state.location,visible=displayed(),report=nearestTraffic(visible,fix,state.line||state.search?.line);
  const button=$('nav-traffic-alert');button.hidden=!report;
  if(report)button.textContent=`${report.label} · ${report.km<1?Math.round(report.km*1000)+' m':report.km.toFixed(1)+' km'}${report.along?' përpara':' në vijë ajrore'}`;
 }
 $('traffic-open').addEventListener('click',open);$('nav-traffic').addEventListener('click',open);$('nav-traffic-alert').addEventListener('click',open);$('traffic-refresh').addEventListener('click',refresh);
 $('traffic-key').addEventListener('click',()=>{dialog.close();keys.open(TRAFFIC_PROVIDER);});
 $('traffic-hide').addEventListener('click',()=>{cancel();data=null;render();$('traffic-status').textContent='Shtresa e raportimeve u hoq.';});
 $('traffic-filter').addEventListener('change',render);
 keys.onLock(id=>{if(id===TRAFFIC_PROVIDER){cancel();if(dialog.open)$('traffic-status').textContent='Çelësi u bllokua. Kërkesat e reja kërkojnë zhbllokim.';}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else render();});
 window.addEventListener('pagehide',cancel);
 createPageTimer(()=>{if(!document.hidden&&data)render();},30000);
 return {open,position,refreshView:render,data:displayed};
}
