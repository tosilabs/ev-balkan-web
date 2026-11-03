export function createInterface({map,closePanels,notify}){
 const $=id=>document.getElementById(id),menu=$('menu-dialog'),layers=$('layers-dialog');
 $('layers-open').addEventListener('click',()=>{closePanels();layers.showModal();});
 layers.addEventListener('click',event=>{if(event.target.closest('[data-layer-close]'))layers.close();},{capture:true});
 $('layers-traffic').addEventListener('click',()=>$('traffic-open').click());
 for(const id of ['map-zoom-in','map-zoom-out','fit-results'])$(id).disabled=!map;
 $('map-zoom-in').addEventListener('click',()=>map?.zoomIn());$('map-zoom-out').addEventListener('click',()=>map?.zoomOut());
 $('more-open').addEventListener('click',()=>{menu.showModal();$('more-open').setAttribute('aria-expanded','true');});
 menu.addEventListener('close',()=>$('more-open').setAttribute('aria-expanded','false'));
 menu.addEventListener('click',event=>{if(event.target.closest('[data-menu-close]'))menu.close();},{capture:true});
 for(const [from,to] of [['menu-vehicle','vehicle-open'],['menu-offline','offline-open'],['menu-report','report-missing'],['menu-sources','sources-open']])$(from).addEventListener('click',()=>$(to).click());
 const advanced=$('advanced-filters');
 function updateFilters(){
  const count=Number($('open-24').checked)+Number($('only-active').checked)+Number(!$('unknown').checked)+Number($('speed').value!=='all');
  $('advanced-count').textContent=count?`${count} aktivë`:'';
  if(count)advanced.open=true;
 }
 for(const id of ['open-24','only-active','unknown','speed'])$(id).addEventListener('change',updateFilters);updateFilters();
 $('search-dialog').addEventListener('close',updateFilters);
 const labels=[['list-open','results-panel'],['journey-open','journey-panel'],['weather-open','weather-panel'],['terrain-open','terrain-panel']];
 const sync=()=>{for(const [trigger,panel] of labels){const selected=!$(panel).hidden;$(trigger).setAttribute('aria-expanded',String(selected));$(trigger).classList.toggle('nav-selected',selected);}};
 const observer=new MutationObserver(records=>{sync();if(document.querySelector('dialog[open]'))return;for(const record of records){const panel=record.target;if(!panel.hidden){const title=panel.querySelector('h2');if(title){title.tabIndex=-1;title.focus({preventScroll:true});}}else if(panel.contains(document.activeElement)){const trigger=labels.find(([,id])=>id===panel.id)?.[0];const visible=$(trigger)?.getClientRects().length?$(trigger):$('layers-open');visible.focus({preventScroll:true});}}});for(const [,panel] of labels)observer.observe($(panel),{attributes:true,attributeFilter:['hidden']});sync();
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;
  const open=labels.find(([,panel])=>!$(panel).hidden);
  if(open){closePanels();($(open[0]).getClientRects().length?$(open[0]):$('layers-open')).focus({preventScroll:true});event.preventDefault();}
 });
 window.addEventListener('offline',()=>{document.body.classList.add('is-offline');$('connectivity-state').hidden=false;notify('Je pa internet. Mund të hapësh udhëtimin e ruajtur te menuja → Udhëtimi offline.');});
 window.addEventListener('online',()=>{document.body.classList.remove('is-offline');$('connectivity-state').hidden=true;notify('Lidhja me internetin u rikthye. Kërko përsëri për të rifreskuar statuset.');});
 if(navigator.onLine===false){document.body.classList.add('is-offline');$('connectivity-state').hidden=false;}
 return {updateFilters,sync};
}
