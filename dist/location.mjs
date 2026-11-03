import {point} from './core.mjs?v=3.1';
export function locationFix(position,now=Date.now()){
 const p=point(position.coords.latitude,position.coords.longitude),accuracy=position.coords.accuracy;
 return {point:p,accuracy:typeof accuracy==='number'&&Number.isFinite(accuracy)&&accuracy>=0?accuracy:null,at:typeof position.timestamp==='number'&&Number.isFinite(position.timestamp)&&position.timestamp>0?Math.min(now,position.timestamp):now};
}
// A separate layer preserves the device marker when search results and routes change.
export function createLocationLayer(map,L){
 // Chargers stay clickable when the vehicle is at a charging point.
 let marker,ring,fix,unavailable=false;
 for(const [name,z] of [['locationAccuracy',460],['devicePosition',595]])if(!map.getPane(name)){map.createPane(name);map.getPane(name).style.zIndex=String(z);}
 const refresh=()=>{
  if(!marker||!fix)return;
  const stale=unavailable||Date.now()-fix.at>120000;
  marker.getElement()?.classList.toggle('location-stale',stale);
  const label=document.createElement('span');label.textContent=`${stale?'Vendndodhja e fundit':'Vendndodhja ime'} · ${new Date(fix.at).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})}${fix.accuracy===null?'':` · saktësia ±${Math.round(fix.accuracy)} m`}${unavailable?' · GPS i padisponueshëm':''}`;
  marker.setTooltipContent(label);marker.getElement()?.setAttribute('aria-label',label.textContent);
 };
 return {
  update(position){
   const next=locationFix(position);if(fix&&next.at<fix.at)return fix;fix=next;unavailable=false;
   const at=[fix.point.lat,fix.point.lon];
   if(!marker){marker=L.marker(at,{pane:'devicePosition',icon:L.divIcon({className:'user-location-marker',html:'<span class="user-location-dot"></span>',iconSize:[24,24],iconAnchor:[12,12]}),title:'Vendndodhja ime',keyboard:true,zIndexOffset:1000}).addTo(map).bindTooltip('',{direction:'top',offset:[0,-12]});}
   else marker.setLatLng(at);
   if(ring){map.removeLayer(ring);ring=null;}
   if(fix.accuracy!==null)ring=L.circle(at,{pane:'locationAccuracy',radius:fix.accuracy,color:'#0875ef',weight:1,opacity:.45,fillColor:'#0875ef',fillOpacity:.09,interactive:false}).addTo(map);
   refresh();return fix;
  },
  unavailable(){unavailable=true;refresh();},refresh
 };
}
